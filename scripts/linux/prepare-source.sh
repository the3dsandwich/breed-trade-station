#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${FLATPAK_GPG_PRIVATE_KEY:?Signing key is required}"
: "${SOURCE_SHA:?Source commit is required}"
: "${SOURCE_RUN_ID:?Tested build is required}"
app_id=io.github.the3dsandwich.BreedTradeStation
key_id=$(cat packaging/linux/flatpak-signing-key.fingerprint)
work=$(mktemp -d)
trap 'gpgconf --homedir "$work/keys" --kill all 2>/dev/null || true; rm -rf "$work"' EXIT
mkdir -m700 "$work/keys"
printf '%s' "$FLATPAK_GPG_PRIVATE_KEY" | gpg --homedir "$work/keys" --batch --import
unset FLATPAK_GPG_PRIVATE_KEY
# Confirm the secret matches the public key players will trust.
gpg --homedir "$work/keys" --batch --list-secret-keys "$key_id" >/dev/null
sign_repo() {
  ostree --repo="$2" init --mode=archive-z2
  flatpak build-import-bundle --gpg-homedir="$work/keys" --gpg-sign="$key_id" "$2" "$1"
  flatpak build-update-repo --gpg-homedir="$work/keys" --gpg-sign="$key_id" --generate-static-deltas "$2"
}
[[ ! -e artifacts/pages ]]
mkdir -p artifacts/pages
sign_repo artifacts/BreedTradeStation-linux-x86_64.flatpak artifacts/pages/repo

# Test normal signature checking and updating through one source URL. This
# isolated installation does not download or run the shared runtime.
export FLATPAK_USER_DIR="$work/installation"
mkdir -p "$work/source"
if [[ -f artifacts/previous/BreedTradeStation-linux-x86_64.flatpak ]]; then
  sign_repo artifacts/previous/BreedTradeStation-linux-x86_64.flatpak "$work/source/repo"
else
  cp -a artifacts/pages/repo "$work/source/repo"
fi
flatpak remote-add --user --gpg-import=packaging/linux/flatpak-signing-key.gpg bts-test "file://$work/source/repo"
flatpak install --user --noninteractive --no-deps --no-related bts-test "$app_id"
before=$(flatpak info --user --show-commit "$app_id")
rm -rf "$work/source/repo"
cp -a artifacts/pages/repo "$work/source/repo"
flatpak update --user --noninteractive --no-deps --no-related "$app_id"
after=$(flatpak info --user --show-commit "$app_id")
expected=$(ostree --repo=artifacts/pages/repo rev-parse "app/$app_id/x86_64/main")
[[ "$after" == "$expected" ]]
if [[ -f artifacts/previous/BreedTradeStation-linux-x86_64.flatpak ]]; then
  [[ "$before" != "$after" ]]
fi
# Check the documented move from a standalone bundle to the update source.
flatpak uninstall --user --noninteractive "$app_id"
flatpak install --user --noninteractive --no-deps --no-related artifacts/BreedTradeStation-linux-x86_64.flatpak
flatpak install --user --noninteractive --no-deps --no-related --reinstall bts-test "$app_id"
[[ "$(flatpak info --user --show-origin "$app_id")" == bts-test ]]
# A source with no trusted key must be rejected, rather than silently accepted.
if flatpak remote-add --user bts-untrusted "file://$work/source/repo" >"$work/untrusted.log" 2>&1 &&
   flatpak remote-info --user bts-untrusted "$app_id" >>"$work/untrusted.log" 2>&1; then
  echo 'An untrusted source was accepted unexpectedly.' >&2
  exit 1
fi
printf 'Signed install/update passed: %s -> %s\nBundle switched to update source.\nUntrusted source rejected.\n' "$before" "$after" > artifacts/source-test.txt
python3 scripts/linux/source-page.py
