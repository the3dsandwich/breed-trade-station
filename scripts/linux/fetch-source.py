"""Select an already tested main build; never publish a PR artifact."""
import json
import os
import re
import subprocess
from pathlib import Path

repo = os.environ["GITHUB_REPOSITORY"]
requested = os.environ.get("PUBLISH_RUN_ID", "")
run_id = requested or os.environ["GITHUB_RUN_ID"]
assert re.fullmatch(r"[0-9]+", run_id), "Expected a build run number"

def api(path):
    return json.loads(subprocess.check_output(["gh", "api", f"repos/{repo}/{path}"], text=True))

if requested:
    run = api(f"actions/runs/{run_id}")
    assert run["conclusion"] == "success", "Build must have passed"
    assert run["head_branch"] == "main", "Only main builds can be published"
    assert run["event"] in ("push", "workflow_dispatch"), "PR builds cannot be published"
    assert run["path"] == ".github/workflows/linux-flatpak.yml", "Wrong build workflow"
    sha = run["head_sha"]
else:
    assert os.environ["GITHUB_REF"] == "refs/heads/main"
    sha = os.environ["GITHUB_SHA"]
assert sha == api("commits/main")["sha"], "A newer main commit exists; publish its tested build instead"
subprocess.run(["gh", "run", "download", run_id, "--repo", repo, "--name", f"BreedTradeStation-linux-x86_64-{sha}", "--dir", "artifacts"], check=True)
# Use a previous tested release for a real old-to-new update check.
for release in api("releases?per_page=30"):
    if release["draft"] or not release["tag_name"].startswith("linux-") or release["tag_name"] == f"linux-{sha}":
        continue
    if not any(a["name"] == "BreedTradeStation-linux-x86_64.flatpak" for a in release["assets"]):
        continue
    subprocess.run(["gh", "release", "download", release["tag_name"], "--repo", repo, "--pattern", "BreedTradeStation-linux-x86_64.flatpak", "--dir", "artifacts/previous"], check=True)
    break
with open(os.environ["GITHUB_ENV"], "a") as env:
    env.write(f"SOURCE_SHA={sha}\nSOURCE_RUN_ID={run_id}\n")
