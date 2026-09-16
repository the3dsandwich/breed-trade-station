"""Write the public source links and a small installation page."""
import base64
import html
import json
import os
from pathlib import Path

out = Path("artifacts/pages")
base = "https://the3dsandwich.github.io/breed-trade-station"
app = "io.github.the3dsandwich.BreedTradeStation"
key = base64.b64encode(Path("packaging/linux/flatpak-signing-key.gpg").read_bytes()).decode()
fingerprint = Path("packaging/linux/flatpak-signing-key.fingerprint").read_text().strip()
(out / "breed-trade-station.flatpakrepo").write_text(f"""[Flatpak Repo]
Title=Breed Trade Station development builds
Url={base}/repo
Homepage={base}/
Description=The newest tested Linux development build of Breed Trade Station.
GPGKey={key}
""")
(out / "breed-trade-station.flatpakref").write_text(f"""[Flatpak Ref]
Title=Breed Trade Station
Name={app}
Branch=main
Url={base}/repo
SuggestRemoteName=breed-trade-station
IsRuntime=false
RuntimeRepo=https://flathub.org/repo/flathub.flatpakrepo
GPGKey={key}
""")
(out / "source.json").write_text(json.dumps({"commit": os.environ["SOURCE_SHA"], "run_id": os.environ["SOURCE_RUN_ID"], "key": fingerprint}, indent=2))
(out / "index.html").write_text(f"""<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Breed Trade Station for Linux</title>
<style>body{{font:18px/1.6 system-ui;max-width:760px;margin:48px auto;padding:0 20px;background:#202024;color:#eee}}a{{color:#96d7ae}}pre{{padding:16px;background:#303035;overflow:auto;border-radius:8px}}code{{font-size:14px}}</style>
<h1>Breed Trade Station for Linux</h1>
<p>Breed Puffs, discover their traits, and trade them. These are early development builds for Linux x86_64.</p>
<p><a href="breed-trade-station.flatpakref">Install the game</a> · <a href="breed-trade-station.flatpakrepo">Add the update source</a></p>
<h2>Install from the terminal</h2>
<pre><code>flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak remote-add --user --if-not-exists breed-trade-station {base}/breed-trade-station.flatpakrepo
flatpak install --user breed-trade-station {app}
flatpak run {app}</code></pre>
<h2>Get updates</h2><p>Your software manager can check this source. You can also run:</p>
<pre><code>flatpak update --user {app}</code></pre>
<p>The first install also downloads a shared GNOME runtime. The game plays offline after installation.</p>
<p>Already installed a release bundle? Close the game, add this source, then run the install command with <code>--reinstall</code> to switch to it. Your native save stays in place. Browser saves are separate.</p>
<p><a href="https://github.com/the3dsandwich/breed-trade-station/releases">Older release downloads</a> · <a href="https://github.com/the3dsandwich/breed-trade-station/issues">Report a problem</a></p>
<p>Build: <code>{html.escape(os.environ["SOURCE_SHA"][:12])}</code><br>Signing key: <code>{fingerprint}</code></p></html>""")
