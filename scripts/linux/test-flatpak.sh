#!/usr/bin/env bash
set -euo pipefail
app_id=io.github.the3dsandwich.BreedTradeStation
report_dir="${BTS_NATIVE_REPORT_DIR:-$PWD/artifacts/native-test}"
mkdir -p "$report_dir"
export BTS_NATIVE_REPORT_DIR="$report_dir"
if [[ -z "${DISPLAY:-}" ]]; then
  exec xvfb-run -a -s '-screen 0 1280x1024x24' dbus-run-session -- bash "$0"
fi
# This script is for a disposable CI/test account: it refuses to overwrite a real save.
if [[ -d "$HOME/.var/app/$app_id/data" ]]; then
  echo 'Use a fresh test account for native smoke tests; an app data directory already exists.' >&2
  exit 1
fi
openbox >"$report_dir/window-manager.log" 2>&1 &
wm_pid=$!
# The SDK supplies a driver that matches its WebKit. Only this test invocation
# shares the network so the host test client can reach its loopback driver port.
flatpak run --devel --share=network --socket=x11 \
  --env=GDK_BACKEND=x11 --env=LIBGL_ALWAYS_SOFTWARE=1 \
  --env=TAURI_WEBVIEW_AUTOMATION=true --env=WEBKIT_DISABLE_DMABUF_RENDERER=1 \
  --command=WebKitWebDriver "$app_id" --host=127.0.0.1 --port=4444 \
  >"$report_dir/webdriver.log" 2>&1 &
driver_pid=$!
trap 'kill "$driver_pid" "$wm_pid" 2>/dev/null || true' EXIT
node scripts/linux/native-smoke.mjs

# Also test the shipped Platform with its normal offline permissions.
# The driver pass above used the SDK for its automation executable.
flatpak run --env=GDK_BACKEND=x11 --env=LIBGL_ALWAYS_SOFTWARE=1 \
  --env=WEBKIT_DISABLE_DMABUF_RENDERER=1 "$app_id" \
  >"$report_dir/platform-launch.log" 2>&1 &
app_pid=$!
trap 'kill "$app_pid" "$driver_pid" "$wm_pid" 2>/dev/null || true' EXIT
visible=false
for attempt in {1..30}; do
  kill -0 "$app_pid"
  if wmctrl -l | grep -q 'Breed Trade Station'; then visible=true; break; fi
  sleep 1
done
[[ "$visible" == true ]]
sleep 3
kill -0 "$app_pid"
import -window root "$report_dir/platform-launch.png"
wmctrl -c 'Breed Trade Station'
wait "$app_pid"
echo 'Shipped Platform launch passed with normal offline permissions.' >"$report_dir/platform-result.txt"
