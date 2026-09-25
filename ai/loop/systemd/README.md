# Daily conversation timer

The timer queues a task in the existing Codex conversation at **09:30 Taipei**.
The Codex client must remain open to process it. The computer must be awake and
online. Missed timer starts are skipped; queued prompts that arrive late refuse
work through the `begin` check.

```sh
pnpm loop bind
pnpm loop dispatch --dry-run
pnpm loop:timer --enable
systemctl --user list-timers breed-trade-station-loop.timer
```

`pnpm loop:timer` without `--enable` installs disabled units. The installer backs
up and removes the old proposal-worker visual-focus override. The new full agent
reads the saved visual focus directly. No login tokens are copied.

```sh
pnpm loop:timer --disable
pnpm loop status
journalctl --user -u breed-trade-station-loop.service
```

The service's two-minute limit bounds **delivery only**, not the agent turn.
The agent's daily work deadline is an instruction, not an automatic kill switch
for the shared conversation. No sandbox settings are changed by the timer.

A running user service manager is required. Linger was enabled on the original
host so the timer can survive logout; this still does not start a closed Codex
client. Check with `loginctl show-user "$USER" -p Linger -p State`.

Full details: [daily workflow](../../../docs/architecture/daily-loop.md).
