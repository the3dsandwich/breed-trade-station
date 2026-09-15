#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
app_id=io.github.the3dsandwich.BreedTradeStation
if [[ ! -f packaging/linux/staged/src-tauri/Cargo.lock ]]; then
  echo "Run pnpm linux:stage first." >&2
  exit 1
fi
mkdir -p artifacts
flatpak-builder --user --force-clean --repo=packaging/linux/repo \
  packaging/linux/build packaging/linux/"$app_id".json
flatpak build-bundle --arch=x86_64 --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo \
  packaging/linux/repo artifacts/BreedTradeStation-linux-x86_64.flatpak "$app_id" main
