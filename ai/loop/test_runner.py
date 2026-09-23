"""Exercise recovery and publication without calling models, GitHub, or git."""
import argparse
import contextlib
from datetime import datetime
import io
import json
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import Mock, patch

import run as runner


class RunnerTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.state = Path(temporary.name)
        self.patch = patch.object(runner, "STATE", self.state)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.record = {"id": "test-round", "status": "running", "phase": "publish",
                       "scheduled": False, "goal": "test", "repo": "owner/game",
                       "worktree": str(self.state / "worktree"), "base_commit": "base",
                       "branch": "loop/test-round", "plan": {"title": "Small change"},
                       "pilot": False, "runner_commit": "runner-version", "repair": 0}
        Path(self.record["worktree"]).mkdir()
        runner.save(self.record)

    def test_setup_failure_stays_visible_and_reports_error(self):
        with patch.object(runner.sys, "argv", ["run.py", "run", "--interactive"]), \
             patch.object(runner.signal, "signal"), patch.object(runner, "repository", return_value="owner/game"), \
             patch.object(runner, "git", return_value="head"), \
             patch.object(runner, "command", side_effect=RuntimeError("fetch failed")), \
             contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(RuntimeError, "fetch failed"):
                runner.main()
        created = [p for p in runner.records() if p.parent.name != self.record["id"]]
        self.assertEqual(len(created), 1)
        failed = json.loads(created[0].read_text())
        self.assertEqual(failed["status"], "failed")
        self.assertEqual(failed["phase"], "setup")
        self.assertIn("fetch failed", failed["error"])
        self.assertTrue((created[0].parent / "report.md").exists())
        self.assertFalse((self.state / "active.json").exists())

    def test_resume_setup_retries_install_before_capture(self):
        self.record.update(phase="setup", status="failed", error="interrupted install")
        runner.save(self.record)
        args = argparse.Namespace(command="resume", run=self.record["id"], interactive=True)
        record = runner.setup_run(args, "owner/game")
        self.assertEqual(record["status"], "running")
        self.assertNotIn("error", record)
        with patch.object(runner, "command") as command, \
             patch.object(runner, "git", return_value="base"), \
             patch.object(runner, "promote_merged_saves"), \
             patch.object(runner, "capture", side_effect=runner.StopRun("capture boundary")):
            with self.assertRaisesRegex(runner.StopRun, "capture boundary"):
                runner.execute(record)
        self.assertIn("install", command.call_args.args[1])
        self.assertEqual(runner.load_record(record["id"])["phase"], "before")
        self.assertTrue((self.state / "runs" / record["id"] / "saves").is_dir())

    def test_model_limits_stop_before_process_launch(self):
        for field, maximum in (("model_calls", "max_model_calls"), ("ai_seconds", "max_ai_seconds"),
                               ("input_tokens", "max_input_tokens")):
            record = dict(self.record, **{field: runner.CONFIG[maximum]})
            with self.subTest(field=field), patch.object(runner.subprocess, "Popen") as spawn:
                with self.assertRaises(runner.StopRun):
                    runner.command(record, ["unused-model"], "blocked", model=True)
                spawn.assert_not_called()

    def test_scheduled_ai_cutoff_allows_only_non_ai_until_report_cutoff(self):
        record = dict(self.record, scheduled=True)
        with patch.object(runner, "in_window", return_value=False), \
             patch.object(runner, "now_local", return_value=datetime(2026, 9, 24, 15)):
            with self.assertRaisesRegex(runner.StopRun, "Outside"):
                runner.gate(record, model=True)
            runner.gate(record, model=False)
            runner.gate(self.record, model=True)  # Explicit interactive work is allowed.
        with patch.object(runner, "now_local", return_value=datetime(2026, 9, 24, 17, 30)):
            with self.assertRaisesRegex(runner.StopRun, "report cutoff"):
                runner.gate(record)

    def test_pause_blocks_even_interactive_run(self):
        (self.state / "pause").touch()
        with self.assertRaisesRegex(runner.StopRun, "Paused"):
            runner.gate(self.record)

    def test_inflight_model_is_terminated_at_cutoff_and_call_count_saved(self):
        process = Mock(pid=12345, returncode=None)
        process.poll.return_value = None
        record = dict(self.record, scheduled=True)
        with patch.object(runner, "in_window", side_effect=[True, False]), \
             patch.object(runner, "now_local", return_value=datetime(2026, 9, 24, 14, 29)), \
             patch.object(runner.subprocess, "Popen", return_value=process), \
             patch.object(runner.os, "killpg") as kill:
            with self.assertRaisesRegex(runner.StopRun, "Stopped model work"):
                runner.command(record, ["unused-model"], "model", model=True)
        kill.assert_called_once_with(12345, runner.signal.SIGTERM)
        saved = runner.load_record(record["id"])
        self.assertEqual(saved["model_calls"], 1)
        self.assertGreaterEqual(saved["ai_seconds"], 0)

    def test_large_prompt_to_stalled_reader_times_out(self):
        # This harmless local child never reads stdin. Its pipe fills immediately;
        # timeout enforcement must still work rather than wait for the child.
        started = time.monotonic()
        with self.assertRaisesRegex(runner.StopRun, "timed out"):
            runner.command(self.record,
                [runner.sys.executable, "-c", "import time; time.sleep(30)"],
                "stalled-input", prompt="x" * 2_000_000, timeout=0.15, model=True)
        self.assertLess(time.monotonic() - started, 3)
        self.assertEqual(runner.load_record(self.record["id"])["model_calls"], 1)

    def git_for_publish(self, *, lines=2, staged=False):
        def fake(*args, **kwargs):
            if args[:2] == ("diff", "--name-only"):
                return "apps/game/src/App.tsx"
            if args[:2] == ("diff", "--numstat"):
                return f"{lines}\t0\tapps/game/src/App.tsx"
            if args[:3] == ("diff", "--cached", "--name-only"):
                return "apps/game/src/App.tsx" if staged else ""
            return ""
        return fake

    def test_publish_reuses_existing_pr_and_already_committed_changes(self):
        def gh(*args):
            if args[:2] == ("pr", "list"):
                return json.dumps([{"number": 42, "url": "https://example/pr/42"}])
            return ""
        with patch.object(runner, "git", side_effect=self.git_for_publish()) as git, \
             patch.object(runner, "gh", side_effect=gh) as github, \
             patch.object(runner, "evidence_publish", return_value="evidence"), \
             patch.object(runner, "pr_body", return_value="Report"):
            runner.publish(self.record)
            runner.publish(self.record)
        self.assertFalse(any(c.args[0] == "commit" for c in git.call_args_list))
        self.assertFalse(any(c.args[:2] == ("pr", "create") for c in github.call_args_list))
        self.assertEqual(self.record["pr"], 42)
        self.assertEqual(self.record["phase"], "ci")

    def test_whole_round_size_limit_blocks_push(self):
        with patch.object(runner, "git", side_effect=self.git_for_publish(lines=runner.CONFIG["max_changed_lines"] + 1)) as git, \
             patch.object(runner, "gh") as github:
            with self.assertRaisesRegex(ValueError, "Whole round"):
                runner.publish(self.record)
        self.assertFalse(any(c.args[0] == "push" for c in git.call_args_list))
        github.assert_not_called()

    def ci_payload(self, draft=True):
        return {"headRefOid": "head", "isDraft": draft, "statusCheckRollup": [
            {"name": name, "conclusion": "SUCCESS", "status": "COMPLETED"}
            for name in ("build-and-typecheck", "e2e", "flatpak")]}

    def test_ci_marks_draft_ready_but_does_not_repeat_ready(self):
        for draft in (True, False):
            record = dict(self.record, pr=42, pilot=True)
            with self.subTest(draft=draft), patch.object(runner, "git", return_value="head"), \
                 patch.object(runner, "gh", return_value=json.dumps(self.ci_payload(draft))) as github:
                runner.check_ci(record)
                ready_calls = [c for c in github.call_args_list if c.args[:2] == ("pr", "ready")]
                self.assertEqual(len(ready_calls), int(draft))
            self.assertEqual(record["status"], "complete")
            self.assertEqual(json.loads((self.state / "pilot.json").read_text())["pr"], 42)

    def test_ci_failure_or_changed_head_never_marks_ready(self):
        for kind in ("failed", "changed"):
            payload = self.ci_payload()
            if kind == "failed":
                payload["statusCheckRollup"][0]["conclusion"] = "FAILURE"
            else:
                payload["headRefOid"] = "someone-elses-commit"
            with self.subTest(kind=kind), patch.object(runner, "git", return_value="head"), \
                 patch.object(runner, "gh", return_value=json.dumps(payload)) as github:
                with self.assertRaises(runner.StopRun):
                    runner.check_ci(dict(self.record, pr=42))
                self.assertFalse(any(c.args[:2] == ("pr", "ready") for c in github.call_args_list))


if __name__ == "__main__":
    unittest.main()
