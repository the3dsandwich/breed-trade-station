#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${GITHUB_REPOSITORY:?Repository is required}"
: "${GITHUB_SHA:?Source commit is required}"
: "${GITHUB_RUN_ID:?Passing build run is required}"
[[ "$GITHUB_SHA" =~ ^[0-9a-f]{40}$ ]]
bundle=BreedTradeStation-linux-x86_64.flatpak
[[ -s "artifacts/$bundle" ]]
tag="linux-$GITHUB_SHA"
short_sha="${GITHUB_SHA:0:12}"
notes=$(mktemp)
trap 'rm -f "$notes"' EXIT
(cd artifacts && sha256sum "$bundle" > "$bundle.sha256")
cat > "$notes" <<EOF
Linux development build from commit $GITHUB_SHA.

Built and play-tested in [GitHub Actions](https://github.com/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID).
Download \`$bundle\` below. The \`.sha256\` file is an optional download checksum.

### Install or update

\`\`\`sh
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install --user ./$bundle
flatpak run io.github.the3dsandwich.BreedTradeStation
\`\`\`

First install also downloads the shared GNOME runtime. Browser and native saves are separate.
This download does not add a game update repository: install a newer bundle to update, keeping your native save.

This is a development build for Linux x86_64, not a stable release. CI tests X11 with software graphics; Wayland and Steam Deck hardware need separate testing.
EOF
# Keep retries on the same commit in one release. Upload before publishing so
# a new public release never appears without its game download.
if ! gh release view "$tag" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
  gh release create "$tag" --repo "$GITHUB_REPOSITORY" --target "$GITHUB_SHA" \
    --draft --prerelease --latest=false --title "Linux development build $short_sha" --notes-file "$notes"
fi
gh release upload "$tag" "artifacts/$bundle" "artifacts/$bundle.sha256" \
  --repo "$GITHUB_REPOSITORY" --clobber
gh release edit "$tag" --repo "$GITHUB_REPOSITORY" --draft=false --prerelease --latest=false --notes-file "$notes"
