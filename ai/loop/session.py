#!/usr/bin/env python3
"""Send the daily task to the user's existing Codex conversation."""
from __future__ import annotations
import argparse
from datetime import datetime, timedelta
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import uuid
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
STATE = Path(os.environ.get('BTS_LOOP_STATE', Path.home() / '.local/state/breed-trade-station-loop')).expanduser().resolve()
CONFIG = json.loads((HERE / 'config.json').read_text())


def now():
    return datetime.now(ZoneInfo(CONFIG['timezone']))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(path)


def read(path):
    return json.loads(path.read_text())


def binding():
    value = read(STATE / 'session.json')
    uuid.UUID(value['thread_id'])
    if value['project'] != str(ROOT):
        raise ValueError('The bound session belongs to another project; bind this checkout first')
    return value


def window(moment):
    moment = moment.astimezone(ZoneInfo(CONFIG['timezone']))
    return CONFIG['start'] <= moment.strftime('%H:%M') < CONFIG['ai_cutoff']


def record_path(day):
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', day):
        raise ValueError('Use a YYYY-MM-DD date')
    datetime.strptime(day, '%Y-%m-%d')
    return STATE / 'days' / (day + '.json')


def message(record):
    return f'''[Scheduled game development — {record['day']} Taipei; dispatch {record['id']}]
This is the user's authorized daily task in THIS existing project conversation.
First run: python3 {HERE / 'session.py'} begin --day {record['day']} --dispatch {record['id']}
If begin refuses, report its reason here and stop this scheduled task. Do not override it or start another session.
Then read {HERE / 'daily-session.md'} and the returned deadline. Use your normal full project tools, permissions, and conversation context. Read files you need; there is no fixed source bundle.
Current focus: {STATE / 'visual-direction/focus.md'} (if present). Review prior daily results in {STATE / 'days'}.
Work in {ROOT}, using an isolated Git worktree for changes. Your outcome and PR/screenshots must appear here in this conversation. Record the result using the finish command in the guide.
This request expires today at {record['expires_at']}. It does not authorize evening catch-up, changing schedules/limits, or merging PRs.
'''


def check():
    data = binding()
    if not shutil.which('codex'):
        raise ValueError('Codex CLI is missing')
    if not (HERE / 'daily-session.md').is_file():
        raise ValueError('Daily task guide is missing')
    return data


def dispatch(dry_run=False):
    data = check()
    moment = now()
    if (STATE / 'pause').exists():
        print('Skipped: daily work is paused'); return 0
    if not window(moment):
        print('Skipped: outside 09:30–14:30 Taipei; no evening catch-up'); return 0
    day = moment.date().isoformat()
    path = record_path(day)
    if path.exists():
        previous = read(path)
        print(f"Already recorded today: {previous['status']} ({previous['id']}). No duplicate sent.")
        return 0
    cutoff_hour, cutoff_minute = map(int, CONFIG['ai_cutoff'].split(':'))
    expiry = moment.replace(hour=cutoff_hour, minute=cutoff_minute, second=0, microsecond=0)
    record = {'id': str(uuid.uuid4()), 'day': day, 'thread_id': data['thread_id'],
        'status': 'dispatching', 'created_at': moment.isoformat(), 'expires_at': expiry.isoformat()}
    prompt = message(record)
    if dry_run:
        print(prompt); return 0
    # Save intent BEFORE delivery. A crash/timeout is ambiguous, never an excuse to send twice.
    write(path, record)
    try:
        result = subprocess.run(['codex', 'queue', '--thread', data['thread_id'], '--message', prompt],
            cwd=ROOT, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired) as error:
        record.update(status='delivery_uncertain', error=str(error))
        write(path, record)
        print('Delivery uncertain; inspect the Codex queue before retrying', file=sys.stderr)
        return 2
    matched = re.search(r'Queued message ([0-9a-f-]+) for thread ([0-9a-f-]+)', result.stdout)
    if result.returncode or not matched or matched[2] != data['thread_id']:
        record.update(status='delivery_failed' if result.returncode else 'delivery_uncertain',
            error=(result.stderr or result.stdout)[-2000:])
        write(path, record)
        print('Daily task was not confirmed delivered. See: ' + str(path), file=sys.stderr)
        return 2
    record.update(status='queued', queue_id=matched[1], queued_at=now().isoformat())
    write(path, record)
    print(f"Queued daily task in conversation {data['thread_id']}. This confirms delivery, not completion.")
    print('Receipt: ' + str(path))
    return 0


def owned_record(day, dispatch_id):
    path = record_path(day)
    record = read(path)
    if record['id'] != dispatch_id:
        raise ValueError('Dispatch ID does not match this day')
    if os.environ.get('CODEX_THREAD_ID') != record['thread_id']:
        raise ValueError('Only the bound project conversation can start or finish this task')
    return path, record


def begin(day, dispatch_id):
    path, record = owned_record(day, dispatch_id)
    if record['status'] != 'queued':
        raise ValueError('This task is not awaiting a start: ' + record['status'])
    moment = now()
    if (STATE / 'pause').exists() or moment.date().isoformat() != day or not window(moment):
        record.update(status='skipped', summary='Task arrived late or while paused; no game work started.',
            finished_at=moment.isoformat())
        write(path, record)
        print(record['summary']); return 2
    deadline = min(datetime.fromisoformat(record['expires_at']), moment + timedelta(minutes=CONFIG['work_minutes']))
    record.update(status='started', started_at=moment.isoformat(), work_deadline=deadline.isoformat())
    write(path, record)
    print(json.dumps(record, indent=2))
    return 0


def finish(day, dispatch_id, outcome, summary_file, pr_url=None):
    path, record = owned_record(day, dispatch_id)
    if record['status'] != 'started':
        raise ValueError('Only a started task can be finished')
    summary = Path(summary_file).read_text().strip()
    if not summary or len(summary.encode()) > 30000:
        raise ValueError('Supply a short, nonempty report (at most 30 KB)')
    if outcome == 'pr' and (not pr_url or not re.fullmatch(r'https://github\.com/the3dsandwich/breed-trade-station/pull/\d+', pr_url)):
        raise ValueError('A PR result needs a link to a PR in this game repository')
    record.update(status=outcome, summary=summary, pr_url=pr_url, finished_at=now().isoformat())
    write(path, record)
    path.with_suffix('.md').write_text(summary + '\n')
    print('Saved result: ' + str(path.with_suffix('.md')))
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('bind'); p.add_argument('--thread', default=os.environ.get('CODEX_THREAD_ID'))
    sub.add_parser('check')
    p = sub.add_parser('dispatch'); p.add_argument('--dry-run', action='store_true')
    for name in ['begin', 'finish']:
        p = sub.add_parser(name); p.add_argument('--day', required=True); p.add_argument('--dispatch', required=True)
        if name == 'finish':
            p.add_argument('--outcome', choices=['pr', 'blocked', 'finding', 'skipped'], required=True)
            p.add_argument('--summary-file', required=True); p.add_argument('--pr')
    for name in ['status', 'pause', 'unpause']: sub.add_parser(name)
    args = parser.parse_args()
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (STATE / 'session.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if args.command == 'bind':
            if not args.thread: raise ValueError('Supply the existing conversation UUID')
            thread = str(uuid.UUID(args.thread))
            write(STATE / 'session.json', {'thread_id': thread, 'project': str(ROOT)})
            print('Bound to existing conversation: ' + thread); return 0
        if args.command == 'check':
            print(json.dumps(check(), indent=2)); return 0
        if args.command == 'dispatch': return dispatch(args.dry_run)
        if args.command == 'begin': return begin(args.day, args.dispatch)
        if args.command == 'finish': return finish(args.day, args.dispatch, args.outcome, args.summary_file, args.pr)
        if args.command == 'pause':
            (STATE / 'pause').write_text(now().isoformat()); print('Paused future dispatch/start. This does not interrupt a live conversation.'); return 0
        if args.command == 'unpause':
            (STATE / 'pause').unlink(missing_ok=True); print('Unpaused; nothing started.'); return 0
        if args.command == 'status':
            print(json.dumps({'binding': read(STATE / 'session.json') if (STATE / 'session.json').exists() else None,
                'paused': (STATE / 'pause').exists(),
                'days': [read(p) for p in sorted((STATE / 'days').glob('*.json'))[-7:]]}, indent=2)); return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError) as error:
        print('Daily session: ' + str(error), file=sys.stderr)
        raise SystemExit(2)
