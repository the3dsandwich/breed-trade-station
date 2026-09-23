# Daily development loop

The loop aims to leave one small, tested game improvement ready to review before
18:00 Taipei time. It does not merge PRs or decide that a game is fun on its own.
You can ask for a follow-up at any time without waiting for tomorrow's run.

## What one round does

1. Check the review queue and create a separate Git working copy.
2. Build the current game and capture a short play session for a new player and a returning player.
3. Give Codex the game docs, selected source, play observations, and screenshots. Ask for one small plan.
4. Ask Codex for proposed file changes. The controller checks their size and allowed paths before applying them.
5. Run checks and capture the changed game using the same starting saves.
6. Ask Claude to review the selected code, change, and play reports independently.
7. Open a draft PR with evidence, then check GitHub CI before marking it ready.

A round can decide that no change is justified. Failed checks or review findings
can lead to a repair, within the round's limits. Work and reports are saved when
the round stops. No automatic merge or paid API fallback is used.

This first version uses **proposals**: the models return structured plans and file
contents. The controller owns file writes, commands, Git operations, and PRs.
Models cannot run their own shell commands. Only game/shared source and game
design docs are eligible for automatic edits. Dependencies, CI, release files,
and the runner itself require a separate developer change.

## Schedule and limits

All scheduled times use `Asia/Taipei`, regardless of the computer's timezone.

| Time | Meaning |
| --- | --- |
| 09:30 | Daily timer starts one round |
| 14:30 | Scheduled AI work stops; no evening catch-up |
| 17:30 | Report deadline; the controller stops starting further work at this cutoff |
| 18:00 | Target time for you to have something to review |
| 20:00–23:00 | Reserved for your own work; no scheduled agent work |

The timer skips missed starts. The machine must be awake, online, and have its
user service manager running. It does not wake the computer. The service also
has a 90-minute total limit, so a normal morning round ends much earlier than
the afternoon deadlines.

Current limits in [config.json](../../ai/loop/config.json):

- At most two open repository PRs before new work is blocked.
- At most one loop PR waiting for review. Use a follow-up to change that PR.
- Six model calls, one hour of model runtime, and two repair attempts per round.
- A reported input-token limit of 400,000 per round.
- At most eight changed files and 600 added/deleted lines per proposal and across the whole round.
- Up to 20 source files supplied as context; only eight may change.
- One active controller run at a time.

**Remaining account allowance is unknown.** These local counters are not Codex's
or Claude's five-hour or weekly balance. They cannot guarantee a full evening
allowance. The afternoon cutoff leaves a buffer, while rate-limit and login
errors stop the round. The runner does not automatically buy extra API usage.
An explicit `--interactive` run can use your allowance outside the scheduled
window; use it only when you want work now.

## First setup and supervised pilot

Use the project's normal Node/pnpm setup, Python 3 with `zoneinfo`, Git, GitHub
CLI, Codex CLI, Claude Code CLI, and Playwright Chromium. Both model tools and
GitHub must already be signed in. The installer does not copy login tokens.

From the repository root:

```sh
python3 ai/loop/run.py doctor
python3 ai/loop/run.py run --interactive --pilot
python3 ai/loop/run.py status
```

The pilot is real work: it can create a working copy, call the models, run the
game, and open a PR. Read its results before enabling daily starts.

Install the timer, initially disabled:

```sh
python3 ai/loop/install_timer.py
```

After a successful pilot and after the tested runner is merged into `main`:

```sh
python3 ai/loop/run.py enable-check
python3 ai/loop/install_timer.py --enable
systemctl --user list-timers breed-trade-station-loop.timer
```

The installer and scheduled service check readiness. The tested runner files
must match merged `main`; an untested local change cannot silently become the
daily runner. See the [timer guide](../../ai/loop/systemd/README.md) for machine
setup, disabling the timer, and service logs.

## Follow up now

In chat, say something like:

> Look at PR #24. The breeding panel feels crowded. Simplify it and update that PR.

The assistant can read the saved context and run a follow-up immediately. The
same operation is available from the command line:

```sh
python3 ai/loop/run.py follow-up --interactive --pr 24 \
  --instruction "Simplify the breeding panel and keep the next goal visible."
```

This supports open `loop/` PRs from this repository with a saved local run record.
It updates the existing branch. If another round owns the working copy, the
follow-up requests a pause and exits; it does not edit alongside that worker.
After the active phase finishes, unpause and retry. Unfinished local edits must
be handled by resuming their run first.

Pause at a phase boundary:

```sh
python3 ai/loop/run.py pause
```

Allow work again; this does not start a task:

```sh
python3 ai/loop/run.py unpause
```

Resume a stopped round using its ID from `status`:

```sh
python3 ai/loop/run.py resume --interactive --run RUN_ID
```

The next scheduled start can resume a wait for CI or a pause caused by the time cutoff. Review blocks, failed checks, and exhausted limits need attention; they do not trigger repeated automatic attempts.

Resume keeps that round's existing budget counters. It does not reset exhausted
limits. For a new manual round with a different focus:

```sh
python3 ai/loop/run.py run --interactive \
  --goal "Make the first baby suggest a useful next breeding choice."
```

## Reports, screenshots, and shared memory

The default local state folder is:

```text
~/.local/state/breed-trade-station-loop/
  runs/RUN_ID/       Run record, report, model logs, checks, and play evidence
  worktrees/        Separate working copies
  saves/            Returning-player progress from merged rounds
```

`BTS_LOOP_STATE` can select a different state folder, useful for testing. Keep a
consistent folder for normal use so follow-ups can find earlier runs.

The PR links to selected evidence published on the repository's
`development-evidence` branch. Full local logs remain available for debugging.
The short report explains the player problem, the proposed improvement, the
result, and the question for the next session.

**Background logs do not automatically appear in the original chat session.**
The PR and local records are shared memory. Ask the assistant to read today's
run or a specific PR; you do not need to restate the whole task. This works in a
new conversation too, as long as the records are available on the machine.

Each play capture includes:

- A desktop screenshot at the start, during breeding, after waiting, and at the end.
- A request-choice screenshot when an enabled request sale is available.
- The starting and resulting save, browser errors, and observed UI text.
- Observed facts kept separate from questions for the player/reviewer.

The new-player input comes from a real blank-browser game and is reused for the
before/after pair. Returning input carries real progress from earlier rounds,
but is promoted **only after its PR is merged**, not merely opened. Each round
uses a private copy of these inputs. Personal browser and Flatpak saves are not
used or changed.

On load, only the save timestamp is refreshed to prevent offline catch-up from
changing the comparison. Birth randomness and animation remain live. Until
merged rounds build up progress, the returning profile is another early-game
save, not evidence of a late-game experience.

The capture is a bounded script using real canvas clicks and visible buttons.
Its layout assumptions can become outdated. A completed capture does not prove
every gameplay goal worked; inspect the action facts. Screenshots prove what
was displayed, not that the mechanic is enjoyable. Claude reviews the text
reports and selected code; Codex receives the selected screenshots. A human
play session remains important for pacing, attachment, and whether to return.

## Security limits on this machine

The current Linux host does not provide a working filesystem sandbox for this
workflow. The user service's attempt to hide the local signing-key folder was
also not enforced on this host. The diagnostics state this limitation.

Removing model shell access and checking allowed edit paths reduces what a
model can directly request. **It is not security isolation.** The controller
runs tests and builds that execute proposed game code as your user. That code
can have the same access to local files and the network as other programs run
by your account. Selected prompts must never contain signing keys or credentials.

For a stronger boundary, move the runner and its checks to a separate account
or machine without personal files or signing keys, or establish a verified
container/VM boundary. Do not assume a separate Git working copy protects those
files. The current proposal-only approach is a bounded development workflow,
not a secure environment for untrusted code.
