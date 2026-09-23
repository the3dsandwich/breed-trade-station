# Daily development timer

This starts one round at **09:30 Taipei time every day**. Missed starts are
skipped (`Persistent=false`). The controller also rejects late scheduled starts
and stops AI work at 14:30 Taipei time. The service has a separate 90-minute
maximum and stops its child processes when it is stopped.

## Install, then enable later

From the repository root:

```sh
python3 ai/loop/install_timer.py
```

This writes user service files, checks them, and leaves the timer **disabled**.
It saves executable search paths, not login tokens or the shell environment.
Keep this checkout at the same path. Reinstall if it moves or tool paths change.

After the supervised pilot passes and the infrastructure PR is merged:

```sh
python3 ai/loop/install_timer.py --enable
systemctl --user list-timers breed-trade-station-loop.timer
```

Disable future starts:

```sh
python3 ai/loop/install_timer.py --disable
```

Disabling the timer leaves an active round alone. To stop it too:

```sh
systemctl --user stop breed-trade-station-loop.service
```

Read service logs:

```sh
journalctl --user -u breed-trade-station-loop.service
```

To inspect and validate generated files without installing anything:

```sh
python3 ai/loop/install_timer.py --output-dir /tmp/bts-loop-units
```

## Computer and account requirements

The computer must be awake and online. The user systemd manager must be running,
and both AI tools must already be signed in. The timer does not wake the computer
or catch up later. It does not copy authentication files.

Check the user manager:

```sh
loginctl show-user "$USER" -p Linger -p State
```

If `Linger=no`, keep a login session open during the work window. Enabling linger
is an optional machine setup change; this installer does not do it.

A timer cannot know that a five-hour token allowance has reset. The controller's
call, runtime, and afternoon limits remain necessary; they are not a guarantee
about account usage or weekly limits.

## Agent permissions and signing-key protection

Only the controller's proposal-only mode is supported. Agents receive selected
files and return proposed edits. They do not get autonomous shell commands or
permission to directly edit the checkout. The controller applies allowed changes
and runs its checks. This is not a general-purpose shell agent service.

Before enabling the timer, the installer runs `run.py enable-check`. The service
repeats this check before every scheduled start. It checks readiness, including a
successful supervised pilot and the merged runner code. A failed check leaves the
timer disabled or prevents that day's run.

The service also asks systemd to hide
`~/.local/share/breed-trade-station/flatpak-signing`. This is extra protection,
not a guarantee. On the initial development host, the user manager accepted
`InaccessiblePaths` but did not enforce it, even with `PrivateUsers=yes`.
The runner's diagnostics must report that limit. Do not treat this service as a
filesystem sandbox or add direct-edit/shell-agent modes on that assumption.
Signing keys and other credentials must never enter agent input files.
