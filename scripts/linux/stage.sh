#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# Build the checked-out game before creating the Flatpak input directory.
pnpm build
stage="$PWD/packaging/linux/staged"
rm -rf "$stage"
mkdir -p "$stage/src-tauri" "$stage/.cargo"
cp -a apps/game/dist "$stage/"
cp apps/game/src-tauri/{Cargo.toml,Cargo.lock,build.rs,tauri.conf.json} "$stage/src-tauri/"
cp -a apps/game/src-tauri/{src,icons,capabilities} "$stage/src-tauri/"
cargo vendor --locked --manifest-path apps/game/src-tauri/Cargo.toml "$stage/vendor" > "$stage/.cargo/config.toml"
# Cargo runs inside the build sandbox, so its vendor directory must be relative.
sed -i 's|^directory = .*|directory = "vendor"|' "$stage/.cargo/config.toml"
