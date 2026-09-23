"""Small enforceable rules; model instructions are not permission checks."""
from __future__ import annotations
import difflib
import hashlib
import json
from datetime import datetime, time
from pathlib import Path, PurePosixPath
from zoneinfo import ZoneInfo

ALLOWED = ("apps/game/src/", "packages/shared/src/", "docs/design/")
SUFFIXES = {".ts", ".tsx", ".css", ".md"}

def now_local(config):
    return datetime.now(ZoneInfo(config["timezone"]))

def in_window(config, now=None):
    now = now or now_local(config)
    if now.tzinfo is not None:
        now = now.astimezone(ZoneInfo(config["timezone"]))
    return time.fromisoformat(config["start"]) <= now.time().replace(tzinfo=None) < time.fromisoformat(config["ai_cutoff"])

def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()

def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n")
    temporary.replace(path)

def allowed_path(path):
    if not isinstance(path, str) or any(ord(c) < 32 for c in path) or "\\" in path:
        return False
    p = PurePosixPath(path)
    return (not p.is_absolute() and str(p) == path
            and ".." not in p.parts and p.suffix in SUFFIXES
            and path.startswith(ALLOWED) and p.name not in {"AGENTS.md", "CLAUDE.md"})

def validate_changes(root, changes, config):
    """Validate the WHOLE proposal before writing any file. No deletes or links."""
    root = Path(root).resolve()
    if not isinstance(changes, list) or not changes or len(changes) > config["max_changed_files"]:
        raise ValueError("Proposal must contain a small nonempty set of files")
    prepared, seen, changed_lines = [], set(), 0
    for change in changes:
        if not isinstance(change, dict) or set(change) != {"path", "content", "old_sha256"}:
            raise ValueError("Each replacement needs path, content, and old_sha256")
        name, content = change["path"], change["content"]
        if not allowed_path(name) or name in seen:
            raise ValueError(f"Disallowed or repeated file: {name}")
        seen.add(name)
        path = root / name
        if path.is_symlink() or any(parent.is_symlink() for parent in path.parents if parent != root):
            raise ValueError(f"Symlink is not an editable game file: {name}")
        if not path.resolve().is_relative_to(root):
            raise ValueError("File escaped working copy")
        old = path.read_text() if path.exists() else None
        if change["old_sha256"] != (digest(old) if old is not None else None):
            raise ValueError(f"Source changed since the proposal was made: {name}")
        if not isinstance(content, str) or not content.strip() or len(content.encode()) > config["max_file_bytes"]:
            raise ValueError(f"Empty or oversized replacement: {name}")
        delta = list(difflib.ndiff((old or "").splitlines(), content.splitlines()))
        changed_lines += sum(line.startswith(("+ ", "- ")) for line in delta)
        prepared.append((path, content))
    if changed_lines > config["max_changed_lines"]:
        raise ValueError(f"Proposal too large: {changed_lines} changed lines")
    return prepared

def apply_changes(root, changes, config):
    prepared = validate_changes(root, changes, config)
    for path, content in prepared:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
