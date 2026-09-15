# Linux app and Flatpak builds

## What ships

The Linux app wraps the existing game with Tauri 2. It opens a 1280 × 900 window, with an 800 × 600 minimum size. It includes the game files, so playing does not need a server or internet connection.

The Flatpak app ID is `io.github.the3dsandwich.BreedTradeStation`. The first package supports x86_64 Linux PCs. It uses GNOME 49 and WebKitGTK. Steam Deck desktop mode may work, but controller support and Steam integration are not included.

## Download and install

1. Open the repository's **Actions** page on GitHub.
2. Open a successful **Linux Flatpak** run for the commit you want.
3. Download the `BreedTradeStation-linux-x86_64-<commit>` artifact and unzip it. GitHub requires sign-in to download build artifacts. Artifacts expire after 14 days.
4. Install Flatpak through your Linux distribution, then run:

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

`.github/workflows/linux-flatpak.yml` runs on pull requests to `main`, pushes to `main`, and manual requests. It only needs read access to repository contents.

The job:

1. Checks out the current commit and builds the frontend using Node 24 and the locked pnpm dependencies.
2. Downloads Rust dependencies using the checked-in `Cargo.lock`, then copies those sources and the built frontend into a staging folder.
3. Compiles Rust **inside GNOME SDK 49**, using its Rust extension from the 25.08 runtime family. Cargo runs with `--locked --offline`. No remotely built game binary is used.
4. Creates and installs a `.flatpak` bundle, then runs the native play test.
5. Uploads the successful bundle and native test results.

The test runs WebKitWebDriver inside the installed app using the matching SDK. It checks WebGL, selects parents through real pointer clicks, waits for a birth, releases the baby, closes the native window through its window manager, and checks the saved pen after reopening. It reads the normal autosave to locate Puffs; it does not inject game state. Screenshots and a JSON result are saved as test artifacts.

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
