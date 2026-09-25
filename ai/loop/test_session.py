import contextlib
from datetime import datetime
import io
import json
import os
import shlex
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from zoneinfo import ZoneInfo
import session as loop
from install_timer import quoted

THREAD = '01a0a555-7a3c-7493-a476-a788fb76f351'
QUEUE = '01a0d7c7-b09f-7ca1-b6ab-69487742b43e'


class SessionTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup)
        self.state = Path(temp.name)
        for p in [patch.object(loop, 'STATE', self.state),
                  patch.object(loop, 'now', return_value=datetime(2026, 9, 25, 9, 30, tzinfo=ZoneInfo('Asia/Taipei'))),
                  patch.dict(os.environ, {'CODEX_THREAD_ID': THREAD}),
                  patch.object(loop.shutil, 'which', return_value='/usr/bin/codex')]:
            p.start(); self.addCleanup(p.stop)
        loop.write(self.state / 'session.json', {'thread_id': THREAD, 'project': str(loop.ROOT)})
        self.output = contextlib.redirect_stdout(io.StringIO()); self.output.__enter__()
        self.addCleanup(self.output.__exit__, None, None, None)

    def deliver(self):
        with patch.object(loop.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0,
                f'Queued message {QUEUE} for thread {THREAD}.', '')) as tool:
            self.assertEqual(loop.dispatch(), 0)
        return loop.read(loop.record_path('2026-09-25')), tool

    def test_delivers_to_exact_thread_without_restricted_worker(self):
        record, tool = self.deliver()
        args = tool.call_args.args[0]
        self.assertEqual(args[:4], ['codex', 'queue', '--thread', THREAD])
        self.assertNotIn('--sandbox', args)
        self.assertIn('normal full project tools', args[-1])
        self.assertEqual(record['status'], 'queued')
        self.assertEqual(record['queue_id'], QUEUE)

    def test_one_delivery_per_day(self):
        self.deliver()
        with patch.object(loop.subprocess, 'run') as tool:
            self.assertEqual(loop.dispatch(), 0); tool.assert_not_called()

    def test_dry_run_sends_nothing_and_creates_no_receipt(self):
        with patch.object(loop.subprocess, 'run') as tool:
            self.assertEqual(loop.dispatch(True), 0); tool.assert_not_called()
        self.assertFalse(loop.record_path('2026-09-25').exists())

    def test_window_uses_taipei_and_excludes_cutoff(self):
        for hour, minute, allowed in [(9, 29, False), (9, 30, True), (14, 29, True), (14, 30, False), (20, 0, False)]:
            self.assertEqual(loop.window(datetime(2026, 9, 25, hour, minute, tzinfo=ZoneInfo('Asia/Taipei'))), allowed)
        self.assertTrue(loop.window(datetime(2026, 9, 25, 1, 30, tzinfo=ZoneInfo('UTC'))))

    def test_pause_and_outside_window_never_send(self):
        (self.state / 'pause').touch()
        with patch.object(loop.subprocess, 'run') as tool:
            loop.dispatch(); tool.assert_not_called()
        (self.state / 'pause').unlink()
        with patch.object(loop, 'window', return_value=False), patch.object(loop.subprocess, 'run') as tool:
            loop.dispatch(); tool.assert_not_called()

    def test_failed_delivery_is_not_success_or_retried(self):
        with patch.object(loop.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1, '', 'unknown thread')):
            self.assertEqual(loop.dispatch(), 2)
        self.assertEqual(loop.read(loop.record_path('2026-09-25'))['status'], 'delivery_failed')
        with patch.object(loop.subprocess, 'run') as tool:
            loop.dispatch(); tool.assert_not_called()

    def test_ambiguous_timeout_is_not_resent(self):
        with patch.object(loop.subprocess, 'run', side_effect=subprocess.TimeoutExpired('codex', 30)):
            self.assertEqual(loop.dispatch(), 2)
        self.assertEqual(loop.read(loop.record_path('2026-09-25'))['status'], 'delivery_uncertain')
        with patch.object(loop.subprocess, 'run') as tool:
            loop.dispatch(); tool.assert_not_called()

    def test_unexpected_response_is_not_confirmed(self):
        with patch.object(loop.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, 'OK', '')):
            self.assertEqual(loop.dispatch(), 2)
        self.assertEqual(loop.read(loop.record_path('2026-09-25'))['status'], 'delivery_uncertain')

    def test_begin_records_deadline_and_rejects_duplicate_start(self):
        record, _ = self.deliver()
        self.assertEqual(loop.begin(record['day'], record['id']), 0)
        started = loop.read(loop.record_path(record['day']))
        self.assertEqual(started['work_deadline'], '2026-09-25T11:00:00+08:00')
        with self.assertRaises(ValueError): loop.begin(record['day'], record['id'])

    def test_deadline_never_extends_past_afternoon_cutoff(self):
        record, _ = self.deliver()
        with patch.object(loop, 'now', return_value=datetime(2026, 9, 25, 14, 0, tzinfo=ZoneInfo('Asia/Taipei'))):
            loop.begin(record['day'], record['id'])
        self.assertEqual(loop.read(loop.record_path(record['day']))['work_deadline'], '2026-09-25T14:30:00+08:00')

    def test_late_next_day_and_paused_messages_skip(self):
        record, _ = self.deliver()
        for moment in [datetime(2026, 9, 25, 20, 0, tzinfo=ZoneInfo('Asia/Taipei')),
                       datetime(2026, 9, 26, 10, 0, tzinfo=ZoneInfo('Asia/Taipei'))]:
            loop.write(loop.record_path(record['day']), record)
            with patch.object(loop, 'now', return_value=moment):
                self.assertEqual(loop.begin(record['day'], record['id']), 2)
            self.assertEqual(loop.read(loop.record_path(record['day']))['status'], 'skipped')
        loop.write(loop.record_path(record['day']), record)
        (self.state / 'pause').touch()
        self.assertEqual(loop.begin(record['day'], record['id']), 2)

    def test_wrong_session_dispatch_and_path_rejected(self):
        record, _ = self.deliver()
        with self.assertRaises(ValueError): loop.begin(record['day'], 'wrong')
        with patch.dict(os.environ, {'CODEX_THREAD_ID': 'another-thread'}):
            with self.assertRaises(ValueError): loop.begin(record['day'], record['id'])
        with self.assertRaises(ValueError): loop.record_path('../../escape')
        loop.write(self.state / 'session.json', {'thread_id': THREAD, 'project': '/another/project'})
        with self.assertRaises(ValueError): loop.check()

    def test_finish_requires_started_and_preserves_blocker(self):
        record, _ = self.deliver()
        summary = self.state / 'summary.md'; summary.write_text('Blocked: game server failed. Logs are saved.')
        with self.assertRaises(ValueError): loop.finish(record['day'], record['id'], 'blocked', summary)
        loop.begin(record['day'], record['id'])
        loop.finish(record['day'], record['id'], 'blocked', summary)
        result = loop.read(loop.record_path(record['day']))
        self.assertEqual(result['status'], 'blocked')
        self.assertIn('game server failed', result['summary'])
        self.assertTrue(loop.record_path(record['day']).with_suffix('.md').exists())

    def test_pr_result_needs_correct_repository_link(self):
        record, _ = self.deliver(); loop.begin(record['day'], record['id'])
        summary = self.state / 'summary.md'; summary.write_text('Small game change tested.')
        with self.assertRaises(ValueError): loop.finish(record['day'], record['id'], 'pr', summary)
        loop.finish(record['day'], record['id'], 'pr', summary, 'https://github.com/the3dsandwich/breed-trade-station/pull/24')
        self.assertEqual(loop.read(loop.record_path(record['day']))['status'], 'pr')

    def test_queued_commands_preserve_custom_state_and_quote_paths(self):
        record = {'day': '2026-09-25', 'id': 'dispatch-id', 'expires_at': '2026-09-25T14:30:00+08:00'}
        custom = self.state / "folder with spaces $literal"
        with patch.object(loop, 'STATE', custom):
            command = loop.task_command('begin', record)
            args = shlex.split(command)
            self.assertEqual(args[1], 'BTS_LOOP_STATE=' + str(custom))
            self.assertEqual(args[-4:], ['--day', record['day'], '--dispatch', record['id']])
            self.assertIn(command, loop.message(record))

    def test_systemd_quoting_handles_paths_and_rejects_newlines(self):
        self.assertEqual(quoted('/tmp/a b%file'), '"/tmp/a b%%file"')
        with self.assertRaises(ValueError): quoted('bad\npath')


if __name__ == '__main__': unittest.main()
