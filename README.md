# Breed Trade Station

A creature-breeding game about raising **Puffs**, passing traits to their babies, and filling requests to earn Gold.

This is an early, playable version. It works offline and saves your progress on your device.

**[Install on Linux](https://the3dsandwich.github.io/breed-trade-station/)** · **[Release downloads](https://github.com/the3dsandwich/breed-trade-station/releases)** · **[Report a problem](https://github.com/the3dsandwich/breed-trade-station/issues)**

## How to play

1. Click a Puff to see its traits and sex.
2. Click a pen to move the selected Puff into it.
3. Put a male and a female in the same pen. Leave room for a baby.
4. Wait for breeding to finish. Babies inherit traits from their parents.
5. Fill requests with matching Puffs to earn Gold, or release extra Puffs to make room.

The game protects your last male and female so you can keep breeding.

## Install on Linux

The Linux app is available as a Flatpak for **x86_64 PCs**. Install Flatpak through your Linux distribution, then run:

```sh
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak remote-add --user --if-not-exists breed-trade-station https://the3dsandwich.github.io/breed-trade-station/breed-trade-station.flatpakrepo
flatpak install --user breed-trade-station io.github.the3dsandwich.BreedTradeStation
flatpak run io.github.the3dsandwich.BreedTradeStation
```

The first install also downloads the shared GNOME runtime. Later launches work offline. The game appears in your desktop's app menu.

Your software manager can check the signed source for updates. You can also run:

```sh
flatpak update --user io.github.the3dsandwich.BreedTradeStation
```

Already installed a `.flatpak` release file? Close the game, add the source above, then switch to it without removing your save:

```sh
flatpak install --user --reinstall breed-trade-station io.github.the3dsandwich.BreedTradeStation
```

Browser and Linux app saves are separate. See the [Linux guide](docs/architecture/linux-builds.md) for backups, standalone downloads, building packages, and signing details.

## Run locally

Use **Node.js 24** and **pnpm 11.1.3**, matching the project's CI and package-manager setting. Run these commands from the project folder:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local address printed by Vite, usually `http://localhost:5173`. No backend server or account is needed for the current game.

## Check changes

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

For browser tests, install Playwright's Chromium browser once, then run the tests:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

The browser test command starts the local game server for you.

## Daily development loop

The daily timer sends work into the existing Codex project conversation. The
agent can explore the source, play the game, involve Claude, and prepare a small
PR with screenshots. Results and follow-ups stay in that conversation. Keep the
Codex session open; delayed tasks skip game work outside the daytime window.

See the [daily loop guide](docs/architecture/daily-loop.md) for setup, limits,
reports, and the difference between queued work and completed work.

## What is built

- Puff traits and inheritance, breeding pens, and breeding progress.
- Requests, Gold, individual and bulk release, and safeguards for the last breeding pair.
- Local saves and progress while away.
- A layout that fits smaller screens.
- A Linux app using Tauri, Flatpak downloads, and a signed update source.
- Automated game tests and native Linux play tests in GitHub Actions.

Online player trading, accounts, and Windows, macOS, and mobile packages are future work. Wayland and real Steam Deck hardware still need testing.

## Project layout

| Folder | Contents |
| --- | --- |
| `apps/game/` | React, TypeScript, PixiJS, and Redux game client |
| `apps/game/src-tauri/` | Tauri desktop wrapper |
| `packages/shared/` | Shared game types and genetics rules |
| `packaging/linux/` | Flatpak package files and public signing key |
| `scripts/linux/` | Linux build, test, release, and update-source scripts |
| `e2e/` | Browser play tests |
| `docs/` | Game design, architecture, and research |

## More about the project

- [Game rules and design](docs/design/core-mechanics.md)
- [Playtest rounds and improvements](docs/design/playtest-rounds.md)
- [Platform choices](docs/architecture/platform.md)
- [Linux installation and builds](docs/architecture/linux-builds.md)
