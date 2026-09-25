# Daily work in the main project conversation

This is a real agent turn in the user's existing conversation. Use the normal
project tools and full permissions that the user granted. Explore files, run
commands, inspect screenshots, and investigate problems yourself. The old
three-file proposal worker is retired. Its restrictions do not apply here.

## Start and time limit

The queued message includes `begin --day ... --dispatch ...`. Run it first.
If it refuses, explain why in this chat and stop this scheduled task. Do not
change its record to force a start. A delayed prompt does not authorize night work.

Read `work_deadline` in the receipt. Work for at most 90 minutes, and stop all
automatic model work by **14:30 Asia/Taipei**, whichever comes first. Check the
clock before delegating, before repairs, and while waiting. Leave time to save
a result. These are instructions to this full agent, not a background process
that can forcibly kill it. Do not kill or interrupt unrelated manual work.

Account quota is unknown. Use the existing subscriptions, never a paid API
fallback. Stop on a provider usage/login limit. Maximum two repair attempts.
Do not change these limits, the schedule, or the runner as part of a game task.

## Work

1. Read project AGENTS.md, the game design/architecture docs, the current local
   focus file named in the prompt, recent daily results, and relevant PR feedback.
   Missing file contents mean **read the files**, not “no change needed.”
2. Check GitHub first. Aim for one small PR; no more than two open repository PRs.
   If a game PR is already waiting for review, report it or address concrete
   feedback on that branch. Do not create a competing change or merge anything.
3. Inspect the checkout and create a separate worktree from current `origin/main`
   for new work. Keep the user's working files and personal game saves untouched.
4. Play the game through real browser actions. Use `ai/loop/capture.mjs` as a
   starting point, then investigate the actual question for this round with
   Playwright or other available tools. A fixed script is not the whole playtest.
   Read and view the screenshots. Keep fresh and carried-progress experiences
   separate; never label a prepared test save as long-term play.
5. Use the subagent playtester/change/retest workflow requested by the user when
   it helps. Give each worker a clear task and let it inspect the relevant source.
   For visual work, involve Claude Opus 5.5 using the installed Claude-review
   skill, read the files needed for that review, and verify its suggestions.
6. Pick one useful, reviewable improvement. Read whatever source is needed.
   Implement directly and run checks appropriate to the change. Keep the game
   rules and saved progress compatible. Update the design/architecture notes.
7. Play again. For visual work, capture before/after desktop and narrow-screen
   screenshots, inspect real trait readability, and test animation and reduced
   motion in the browser. Save an animation recording when feasible; screenshots
   alone do not prove motion quality. Say exactly what was and was not checked.
8. Open/update the PR with the player problem, change, test results, screenshots,
   limits, and a useful question for the next session. Attach images and videos
   directly to the PR with a current GitHub CLI
   (`gh pr edit --attach`), and put review notes in its description. Do not
   create an evidence branch. Use CI artifacts for test logs when available;
   keep raw local saves/reports in the run folder and say where they are.
   Verify uploaded links work before deleting local evidence. Publish only
   project evidence, never secrets. See the attachment examples in
   `docs/architecture/daily-loop.md`.
   Check web and native CI. If time runs out, leave a clearly marked draft and
   report the remaining checks rather than pretending completion.

Use the earlier eight-file/600-line size as a planning guide, not a blind
file-access restriction. Prefer a small slice of a larger idea. The user's
current focus is the staged Dusk Ranch visual refresh, unless later feedback
changes that direction.

## Every run leaves a visible result

End with a short plain-English report **in this conversation**: PR, useful
finding, or concrete blocker. A missing source file or broken tool must not
be silently reported as a successful “no change” day. Explain what you tried,
what remains, and what the next session should do.

Also write a short Markdown summary outside the worktree. Use `finish_command`
from the begin receipt and append the outcome, summary path, and optional PR.
It preserves the correct state folder even when a custom folder is configured.
For example, with the default state folder:

```sh
python3 /home/weiwei/breed-trade-station/ai/loop/session.py finish \
  --day YYYY-MM-DD --dispatch DISPATCH_ID \
  --outcome pr --pr https://github.com/the3dsandwich/breed-trade-station/pull/NUMBER \
  --summary-file /absolute/path/to/daily-summary.md
```

Use `blocked`, `finding`, or `skipped` instead of `pr` when appropriate, omitting
`--pr`. Preserve work and evidence on failure. If the session crashes before
finishing, `pnpm loop status` must continue to show `started`, not success.
A human can follow up in this chat immediately; no separate morning worker owns
its context. A later explicit user request can authorize manual evening work.
