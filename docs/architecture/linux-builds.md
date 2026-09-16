# Linux app and Flatpak builds

## What ships

The Linux app wraps the existing game with Tauri 2. It opens a 1280 × 900 window, with an 800 × 600 minimum size. It includes the game files, so playing does not need a server or internet connection.

The Flatpak app ID is `io.github.the3dsandwich.BreedTradeStation`. The first package supports x86_64 Linux PCs. It uses GNOME 49 and WebKitGTK. Steam Deck desktop mode may work, but controller support and Steam integration are not included.

## Download and install

For updates through your software manager, use the [update source](#install-with-an-update-source). Standalone release downloads remain available below.

1. Open [GitHub Releases](https://github.com/the3dsandwich/breed-trade-station/releases) and choose the newest Linux development build.
2. Download `BreedTradeStation-linux-x86_64.flatpak` from its **Assets** section. The optional `.sha256` file lets you check the download. Release files do not have the CI artifact's 14-day expiry.
3. Install Flatpak through your Linux distribution, then run:

```sh
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install --user ./BreedTradeStation-linux-x86_64.flatpak
flatpak run io.github.the3dsandwich.BreedTradeStation
```

The first install downloads the GNOME runtime, which is much larger than the game. Later Flatpak apps can share it. The game is **not published on Flathub**; Flathub only supplies its runtime. Downloading and installing another build with the same app ID updates the app while keeping its save.

The installed app also appears in your desktop's app menu. To remove it while keeping your save:

```sh
flatpak uninstall --user io.github.the3dsandwich.BreedTradeStation
```

## Saves

The native app saves to WebKit's local storage inside:

```text
~/.var/app/io.github.the3dsandwich.BreedTradeStation/
```

The exact files below that folder belong to WebKit and can change. Close the app before backing up the whole folder. Do not use `flatpak uninstall --delete-data` if you want to keep your save.

Browser saves and native saves are separate. This build does not import or sync a browser save. Updates keep the native save as long as the app ID stays the same. The frontend saves before the native window closes, as well as during normal autosave.

## CI builds

`.github/workflows/linux-flatpak.yml` runs on pull requests to `main`, pushes to `main`, and manual requests. The build and PR jobs only need read access. A separate release job has write access and runs only after a successful build on `main` (push/merge or manual run). PRs cannot publish releases.

The job:

1. Checks out the current commit and builds the frontend using Node 24 and the locked pnpm dependencies.
2. Downloads Rust dependencies using the checked-in `Cargo.lock`, then copies those sources and the built frontend into a staging folder.
3. Compiles Rust **inside GNOME SDK 49**, using its Rust extension from the 25.08 runtime family. Cargo runs with `--locked --offline`. No remotely built game binary is used.
4. Creates and installs a `.flatpak` bundle, then runs the native play test.
5. Uploads the successful bundle and native test results as CI artifacts (kept for 14 days).
6. On `main`, downloads that exact tested artifact into a separate job and publishes it with a SHA-256 checksum as a GitHub development prerelease. Each source commit has its own `linux-<full-commit>` tag. Rerunning the same commit updates that release. New releases stay draft until their files are uploaded. These builds do not replace the latest stable release.

PR builds stay available through **Actions**: download and unzip the `BreedTradeStation-linux-x86_64-<commit>` artifact. GitHub requires sign-in for CI artifact downloads. Public release downloads do not require sign-in.

The test runs WebKitWebDriver inside the installed app using the matching SDK. It checks WebGL, selects parents through desktop mouse clicks (xdotool), waits for a birth, releases the baby, closes the native window through its window manager, and checks the saved pen after reopening. It reads the normal autosave to locate Puffs; it does not inject game state. It then launches the app using the shipped Platform and normal offline permissions, and captures that window too. Screenshots and a JSON result are saved as test artifacts. The CI display uses X11; Wayland still needs a separate manual check.

The test temporarily allows network access so the local test driver can talk to the app. Run it only in a fresh test account: it refuses to overwrite an existing native save. The shipped app itself has no network permission.

## Build locally

Install Node 24, pnpm, Rust, Flatpak, and flatpak-builder. You do not need host GTK development packages: Rust compiles inside the SDK.

```sh
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub org.gnome.Platform//49 org.gnome.Sdk//49 org.freedesktop.Sdk.Extension.rust-stable//25.08
pnpm install --frozen-lockfile --ignore-scripts
pnpm linux:stage
pnpm linux:build
```

The result is `artifacts/BreedTradeStation-linux-x86_64.flatpak`. Staging downloads dependencies and needs internet access; the Rust build runs offline. Build outputs and copied dependency sources are ignored by Git.

For direct native development, install the [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/), run `pnpm build`, then:

```sh
cargo run --manifest-path apps/game/src-tauri/Cargo.toml --locked --features custom-protocol
```

This uses the built frontend; rebuild it after frontend changes.

## Packaging notes

The package grants display access, shared memory for X11, and GPU access. It does not grant access to the home folder, all host files, or the network. Tauri can only listen for its close event and destroy its own main window after saving.

PixiJS needs JavaScript code generation for its shaders, so the app's content security policy allows `unsafe-eval`. Scripts and worker files otherwise come from the bundled app. This is an offline game with no remote content.

The repository has no project license yet. The app metadata marks it `LicenseRef-proprietary` to reflect that no reuse license has been granted. The new metadata description itself is CC0. This does not add a license to the game. A public store release needs a separate licensing decision.

Sources: [Tauri setup](https://v2.tauri.app/start/prerequisites/), [Tauri configuration](https://v2.tauri.app/reference/config/), and [Flatpak Rust build guidance](https://github.com/flatpak/flatpak-builder-tools/blob/master/cargo/README.md).

## Install with an update source

The [Linux download page](https://the3dsandwich.github.io/breed-trade-station/) offers a signed Flatpak source. Add it once and install the game:

```sh
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak remote-add --user --if-not-exists breed-trade-station https://the3dsandwich.github.io/breed-trade-station/breed-trade-station.flatpakrepo
flatpak install --user breed-trade-station io.github.the3dsandwich.BreedTradeStation
flatpak run io.github.the3dsandwich.BreedTradeStation
```

Your desktop software manager can check this source for updates. To update by hand:

```sh
flatpak update --user io.github.the3dsandwich.BreedTradeStation
```

If you already installed a release bundle, close the game, add the source above, then switch the installation to it:

```sh
flatpak install --user --reinstall breed-trade-station io.github.the3dsandwich.BreedTradeStation
```

The app ID stays the same, so the native save stays in place. Do not uninstall with `--delete-data`. This is a development update source; it follows the newest tested `main` build. Browser saves are still separate.

## How source publishing works

A separate `source` job runs after the native build/play test passes on `main`. It downloads that run's exact Flatpak, imports it into an OSTree archive repository, signs the app commit and repository summary, and generates static download files. It checks that the source still matches the current `main` commit before preparing a deployment. PRs cannot run this publishing job.

The job tests a signed install, replaces the source with the new build, and checks that `flatpak update` changes the installed commit. When an older release exists, the check uses that real older bundle. It also checks rejection of a source without a trusted key. These package tests skip runtime downloads and do not run the game; the earlier native play test covers gameplay.

The source publishes through GitHub Pages at `https://the3dsandwich.github.io/breed-trade-station/`. A final check installs from the public HTTPS source and compares its commit with the prepared repository. A `.flatpakrepo` file adds the source; a `.flatpakref` file installs the app and offers its GNOME runtime source. GitHub's `github-pages` environment restricts publishing to `main`; the setup branch is allowed only during the first deployment test.

The source keeps only the newest app commit, plus its signed metadata and downloads. It does not promise rollback history. Previous standalone bundles remain in GitHub Releases. Builds are small enough to download in full, so updates do not depend on preserving old repository objects. Source jobs run one at a time. Main builds are not cancelled midway through publishing; PR builds can still cancel older PR runs.

### Signing key

- Public key: `packaging/linux/flatpak-signing-key.gpg`; its full fingerprint is in the adjacent `.fingerprint` file.
- Private key: repository Actions secret `FLATPAK_GPG_PRIVATE_KEY`. It is imported into a temporary keyring only for signing, and that keyring is removed before artifact upload.
- The original key and revocation certificate have a protected local backup at `~/.local/share/breed-trade-station/flatpak-signing/`. Keep that folder private and back it up securely. GitHub cannot return a stored secret later.
- The key has no automatic expiry. Keep using this same key for updates. Replacing it without a key transition would break existing users' trust in the source.

Do not put the private key in Git, logs, Pages, or release downloads. Only public repository files are uploaded. The signing step verifies that the secret contains the checked-in public key's fingerprint.

### Manual publishing and recovery

The Linux Flatpak workflow has an optional `publish_run_id` input. Leave it empty for a normal build. Provide a successful main build's run number to publish its existing artifact without compiling again. The script rejects failed builds, PR builds, other workflows, and builds that do not match current `main`. This also lets an authorized maintainer retry a deployment. Pages environment rules still apply.

To restore a lost deployment, rerun publishing for the current successful main build. To recover a lost Actions secret, export the original private key from the protected backup and restore that same secret. If the key is compromised, use its revocation certificate and plan a new trusted source; do not silently generate a replacement key.

Sources: [Flatpak repository hosting](https://docs.flatpak.org/en/latest/hosting-a-repository.html), [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), and [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
