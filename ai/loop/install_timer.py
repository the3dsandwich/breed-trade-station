#!/usr/bin/env python3
"""Install the daily user timer, disabled unless --enable is given."""
from __future__ import annotations

import argparse
from pathlib import Path
import shutil
import subprocess
import sys

UNIT = "breed-trade-station-loop"


def quoted(value: str) -> str:
    """Quote one systemd argument; percent expansion is separate from quoting."""
    if "\n" in value or "\r" in value or "\0" in value:
        raise ValueError("Paths must not contain newlines or NUL")
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"').replace("%", "%%") + '"'


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--enable", action="store_true", help="Enable the timer after a successful pilot and merge")
    mode.add_argument("--disable", action="store_true", help="Disable future timer starts; does not interrupt an active round")
    parser.add_argument("--output-dir", type=Path, help="Write templates here only, without changing systemd")
    parser.add_argument("--key-dir", type=Path, default=Path.home() / ".local/share/breed-trade-station/flatpak-signing")
    args = parser.parse_args()
    if args.output_dir and (args.enable or args.disable):
        parser.error("--output-dir cannot be combined with --enable or --disable")
    if args.disable:
        run("systemctl", "--user", "disable", "--now", UNIT + ".timer")
        print("Daily timer disabled. An already running round is left alone.")
        return 0

    repo = Path(__file__).resolve().parents[2]
    key_dir = args.key_dir.expanduser().absolute()
    required = ("codex", "claude", "pnpm", "node", "git", "gh")
    tool_dirs = []
    for tool in required:
        binary = shutil.which(tool)
        if not binary:
            parser.error(f"Required command is missing from PATH: {tool}")
        tool_dirs.append(str(Path(binary).parent))
    # Save only executable search paths, never the shell's full environment or auth.
    paths = list(dict.fromkeys(tool_dirs + [str(Path(sys.executable).parent), "/usr/local/bin", "/usr/bin", "/bin"]))
    replacements = {
        "REPO": str(repo), "PYTHON": sys.executable,
        "RUNNER": str(repo / "ai/loop/run.py"), "KEY_DIR": str(key_dir),
        "PATH_ENV": "PATH=" + ":".join(paths), "INACCESSIBLE": "-" + str(key_dir),
    }
    template_dir = repo / "ai/loop/systemd"
    service = (template_dir / (UNIT + ".service.in")).read_text()
    for key, value in replacements.items():
        rendered = value.replace("%", "%%") if key == "REPO" else quoted(value)
        service = service.replace("@" + key + "@", rendered)
    destination = args.output_dir or Path.home() / ".config/systemd/user"
    destination.mkdir(parents=True, exist_ok=True)
    (destination / (UNIT + ".service")).write_text(service)
    shutil.copyfile(template_dir / (UNIT + ".timer"), destination / (UNIT + ".timer"))
    run("systemd-analyze", "--user", "verify", str(destination / (UNIT + ".service")), str(destination / (UNIT + ".timer")))
    if args.output_dir:
        print(f"Wrote and checked units in {destination}. No timer was installed or enabled.")
        return 0
    run("systemctl", "--user", "daemon-reload")
    # Default is disabled even if an earlier install enabled it.
    run("systemctl", "--user", "disable", "--now", UNIT + ".timer")
    if args.enable:
        run(sys.executable, str(repo / "ai/loop/run.py"), "enable-check")
        run("systemctl", "--user", "enable", "--now", UNIT + ".timer")
        print("Timer enabled: 09:30 Taipei daily. Missed runs are skipped.")
    else:
        print("Timer installed and DISABLED. Enable only after the pilot passes and the code is merged.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (subprocess.CalledProcessError, OSError, ValueError) as error:
        print(f"Timer setup failed: {error}", file=sys.stderr)
        raise SystemExit(1)
