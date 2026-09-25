# Daily work in the main Codex conversation

The daily timer sends a prompt to the user's **existing project conversation**
with `codex queue`. That conversation keeps its normal tools, full permissions,
project context, and ability to read files. Its progress and final reply appear
in the same conversation, where the user can follow up immediately.

This replaces the original proposal-only pipeline. On September 24 and 25,
2026, that pipeline supplied three fixed UI files to a tool-less planner. The
visual task required canvas source, so it returned `no_change` twice. The old
runner incorrectly treated missing context as successful completion and left
only local reports. That approach is retired; historical reports are preserved.

## What runs where

- **systemd timer:** fires at 09:30 Asia/Taipei and skips missed starts.
- **session.py:** checks time/pause state, saves a receipt, and queues one prompt
  for the bound conversation. It does not start a separate model worker.
- **Main Codex conversation:** explores the project, plays and changes the game,
  delegates where useful, asks Claude for input, verifies work, opens a PR, and
  reports here. The task guide is [daily-session.md](../../ai/loop/daily-session.md).
- **Local records:** `~/.local/state/breed-trade-station-loop/days/DATE.json`
  separates dispatch, start, and outcome. A completed run also has `DATE.md`.

**Keep this local Codex session open**, and the computer awake and online.
`codex queue` confirms a queued message; it does not prove a turn ran. If Codex
is closed, work can remain queued until the conversation is resumed. Late
prompts must run `begin` first; it records a skip and refuses game work outside
the allowed day/window. There is no promise of an automatic wake-up while the
Codex client is closed. Keep the session's normal shell and browser access.

## Schedule and limits

The timer queues at 09:30 Taipei. Delivery and `begin` refuse work outside
09:30–14:30. Each started task receives a deadline of 90 minutes from start,
or 14:30, whichever is earlier. The goal remains a reviewable PR before 18:00.

The **full agent follows the work deadline and repair/PR limits as instructions**.
The dispatcher does not forcibly interrupt this shared conversation, count all
model calls, or police its file access. Killing the main session could also kill
manual user work. The earlier worker's mechanical model-call/token caps no
longer apply. Remaining subscription allowance is unknown; stop on provider
limits and never switch to paid API credentials. A delayed turn still uses some
model input to read the prompt and report the skip; it must not start game work.

The guide asks for one small PR, at most two open repository PRs, and at most two
repair attempts. Eight files/600 lines are a planning guide, not a restriction on
what the agent can inspect. Missing files should be read. Every run should leave
a PR, a useful finding, or a clear blocker in this chat and a local report.

## Bind and install

From the project root, in the intended Codex conversation:

```sh
pnpm loop bind                 # uses CODEX_THREAD_ID
pnpm loop check
pnpm loop dispatch --dry-run   # prints a prompt only, within the daytime window
pnpm loop:timer --enable
```

Outside Codex, supply the exact existing conversation UUID:

```sh
pnpm loop bind --thread SESSION_UUID
```

The installer validates the units and migrates the old `50-visual-focus.conf`
override into the local `retired/` folder. The full agent reads the existing
`visual-direction/focus.md` directly, including the Opus 5.5 art proposal. It
must still check that proposal against real source and rendered screenshots.
The installer without `--enable` leaves the timer disabled.

A real dispatch uses the same path as the timer:

```sh
pnpm loop dispatch
```

One delivery record is allowed per Taipei day. A failed or ambiguous delivery
is not automatically resent; inspect the Codex queue and receipt first. This
avoids duplicate turns when a process stops after queuing but before recording
its reply. There is no direct editing of Codex's internal database.

## Follow up and inspect

Simply reply in this conversation to change the plan or follow up on a PR.
The scheduler does not own a second hidden development session.

```sh
pnpm loop status
pnpm loop pause
pnpm loop unpause
systemctl --user list-timers breed-trade-station-loop.timer
journalctl --user -u breed-trade-station-loop.service
```

Pause blocks future deliveries and starts; it does not interrupt an active turn.
An explicit user request can authorize manual work outside the daily window.
`queued` means accepted by the CLI, not executed. `started` means the agent called
`begin`, not that tests passed. If a session crashes before `finish`, the record
stays `started`, making the incomplete run visible. Dispatch failures exit
nonzero and remain in the receipt and journal.

Full access is the access the user explicitly requested for this main session.
It is not filesystem isolation. Do not read or send unrelated files, credentials,
or signing keys to model services. No PR is merged automatically.

## Evidence and verification

Reuse `capture.mjs` for a repeatable initial browser sample, then explore the
actual task. Use separate saves, inspect screenshots, and verify motion directly
when changing animation. The old `runs/` and `saves/` remain available; a carried
save should only come from merged work. The old runner no longer promotes saves
automatically, so verify the source PR was merged before updating the baseline.

Unit tests cover time boundaries, duplicate prevention, ambiguous delivery,
thread ownership, late starts, deadlines, and truthful completion records.
A queued delivery test is not a full daily-development test: first observe its
acknowledgement in the target chat, then inspect the first real scheduled run.

### Screenshots and clips belong in the PR

Upload images and videos as GitHub attachments, rather than committing them to
a branch. Put the review notes in the PR description. Keep raw test saves and
logs in the local run folder; use CI artifacts when the workflow provides them,
and link the actual artifact/run. Be clear about artifact expiry.

First check `gh pr edit --help` for `--attach`. The local Homebrew GitHub CLI
2.101.0 supports it; the older apt 2.45.0 does not. Check `command -v gh` if an
installed update is not being used. This uses the existing GitHub sign-in.

Write a body file with local image paths, then pass the same paths as attachments:

```markdown
## Before and after

![Before](./evidence/before.png)
![After](./evidence/after.png)

## Motion

![](./evidence/motion.webm)
```

```sh
gh pr edit NUMBER --body-file /absolute/path/pr-body.md \
  --attach ./evidence/before.png \
  --attach ./evidence/after.png \
  --attach ./evidence/motion.webm
```

Use `gh pr create` with the same attachment flags when opening a PR. With
`--body-file`, supply the complete desired description: it replaces the existing
body. For an existing PR, read its latest body first and preserve review context.
The CLI replaces matching local paths with hosted URLs. A video reference in
its own paragraph becomes an embedded player. Keep large galleries inside a
`<details>` block so the main review is easy to scan.

Read the saved PR body back and check every uploaded URL. A command can upload
some attachments and fail on others; on any failure inspect the current body
before retrying. Never delete the source files or a legacy evidence branch
until the replacement links are verified. Preserve a local archive of old
reports and test saves before retiring old storage.

The previous evidence branch was retired after migrating PRs #22, #23 and #25.
Future runs should not recreate it. [GitHub attachment documentation](https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli).
