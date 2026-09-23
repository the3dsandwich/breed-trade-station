"""Checks for the boundaries that protect each daily edit."""
import copy
from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import unittest

from policy import allowed_path, apply_changes, digest, in_window, validate_changes

CONFIG = json.loads((Path(__file__).parent / "config.json").read_text())


class WindowTests(unittest.TestCase):
    def test_start_inclusive_cutoff_exclusive(self):
        for hour, minute, expected in [(9, 29, False), (9, 30, True), (14, 29, True), (14, 30, False), (20, 0, False)]:
            with self.subTest(hour=hour, minute=minute):
                self.assertEqual(in_window(CONFIG, datetime(2026, 9, 24, hour, minute)), expected)

    def test_aware_times_convert_to_taipei(self):
        self.assertTrue(in_window(CONFIG, datetime(2026, 9, 24, 1, 30, tzinfo=timezone.utc)))
        self.assertFalse(in_window(CONFIG, datetime(2026, 9, 24, 6, 30, tzinfo=timezone.utc)))


class PathTests(unittest.TestCase):
    def test_only_game_shared_and_design_source(self):
        for path in ("apps/game/src/App.tsx", "packages/shared/src/types.ts", "docs/design/notes.md"):
            self.assertTrue(allowed_path(path), path)
        for path in (None, 42, "/apps/game/src/A.ts", "apps/game/src/../package.json", "apps/game/src//A.ts",
                     "./apps/game/src/A.ts", "apps/game/src/A.ts/", "apps/game/src/AGENTS.md",
                     "docs/design/CLAUDE.md", "ai/loop/run.py", "apps/game/src/file.sh",
                     "apps/game/src/config.json", "apps/game/src/a\n.ts", "apps/game/src/a\\b.ts"):
            with self.subTest(path=path):
                self.assertFalse(allowed_path(path))


class ProposalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.config = copy.deepcopy(CONFIG)
        self.name = "apps/game/src/state.ts"
        self.path = self.root / self.name
        self.path.parent.mkdir(parents=True)
        self.path.write_text("const value = 1;\n")

    def change(self, content="const value = 2;\n", name=None, old=None):
        return {"path": name or self.name, "content": content,
                "old_sha256": digest(self.path.read_text()) if old is None else old}

    def test_updates_require_matching_digest_and_new_files_require_null(self):
        apply_changes(self.root, [self.change()], self.config)
        self.assertEqual(self.path.read_text(), "const value = 2;\n")
        with self.assertRaisesRegex(ValueError, "Source changed"):
            validate_changes(self.root, [self.change(old="stale")], self.config)
        change = self.change(name="docs/design/new.md")
        with self.assertRaisesRegex(ValueError, "Source changed"):
            validate_changes(self.root, [change], self.config)
        change["old_sha256"] = None
        apply_changes(self.root, [change], self.config)
        self.assertTrue((self.root / change["path"]).is_file())

    def test_all_files_validated_before_any_write(self):
        before = self.path.read_text()
        with self.assertRaises(ValueError):
            apply_changes(self.root, [self.change(), self.change(name=".github/workflows/build.yml")], self.config)
        self.assertEqual(self.path.read_text(), before)

    def test_duplicates_and_malformed_proposals_rejected(self):
        for changes in (None, [], {}, [None], [{"path": self.name}], [self.change(), self.change()]):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                validate_changes(self.root, changes, self.config)

    def test_byte_file_and_line_limits(self):
        self.config["max_file_bytes"] = 3
        with self.assertRaisesRegex(ValueError, "oversized"):
            validate_changes(self.root, [self.change(content="界界")], self.config)
        self.config["max_file_bytes"] = 1000
        self.config["max_changed_files"] = 1
        with self.assertRaisesRegex(ValueError, "small nonempty"):
            validate_changes(self.root, [self.change(), self.change()], self.config)
        self.config["max_changed_lines"] = 1
        with self.assertRaisesRegex(ValueError, "too large"):
            validate_changes(self.root, [self.change()], self.config)
        self.config["max_changed_lines"] = 2
        validate_changes(self.root, [self.change()], self.config)

    def test_empty_content_not_allowed(self):
        for content in ("", "  \n", None, 123):
            with self.subTest(content=content), self.assertRaisesRegex(ValueError, "Empty or oversized"):
                validate_changes(self.root, [self.change(content=content)], self.config)

    def test_file_and_directory_symlinks_rejected(self):
        target = self.root / "outside.ts"
        target.write_text("private")
        link = self.path.parent / "linked.ts"
        link.symlink_to(target)
        with self.assertRaisesRegex(ValueError, "Symlink"):
            validate_changes(self.root, [self.change(name="apps/game/src/linked.ts")], self.config)
        parent = self.path.parent / "linked"
        parent.symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "Symlink"):
            validate_changes(self.root, [self.change(name="apps/game/src/linked/new.ts")], self.config)


if __name__ == "__main__":
    unittest.main()
