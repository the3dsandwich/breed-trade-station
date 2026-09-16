#!/usr/bin/env bash
set -euo pipefail
app_id=io.github.the3dsandwich.BreedTradeStation
url=https://the3dsandwich.github.io/breed-trade-station
expected=$(ostree --repo=artifacts/pages/repo rev-parse "app/$app_id/x86_64/main")
# Pages/CDN may need a moment to expose the new deployment.
ready=false
for attempt in {1..12}; do
  if flatpak remote-add --user --if-not-exists breed-trade-station "$url/breed-trade-station.flatpakrepo" &&
     [[ "$(flatpak remote-info --user --show-commit breed-trade-station "$app_id")" == "$expected" ]]; then
    ready=true
    break
  fi
  sleep 10
done
[[ "$ready" == true ]]
flatpak install --user --noninteractive --no-deps --no-related breed-trade-station "$app_id"
[[ "$(flatpak info --user --show-commit "$app_id")" == "$expected" ]]
echo "Public signed source install passed: $expected"
