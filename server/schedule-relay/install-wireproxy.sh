#!/bin/sh
set -eu
cd "$(dirname "$0")"
case "$(uname -s)/$(uname -m)" in
  Linux/x86_64) asset=367597472; checksum=b7dcff8f6e9d3410364e432aff24154eaa8db8206e0c6faac35d6c6ab06dac51 ;;
  Linux/aarch64) asset=367597471; checksum=aa234db9ef0b2774cb04a79f391bd41c2ededd815fc1a1c720cfdc693c70898d ;;
  *) echo 'Wireproxy build requires Linux amd64 or arm64' >&2; exit 1 ;;
esac
mkdir -p dist
archive=$(mktemp)
trap 'rm -f "$archive"' EXIT
curl --fail --silent --show-error --location --retry 3 --max-time 120 \
  --header 'Accept: application/octet-stream' \
  "https://api.github.com/repos/windtf/wireproxy/releases/assets/${asset}" -o "$archive"
printf '%s  %s\n' "$checksum" "$archive" | sha256sum --check --status
tar -xzf "$archive" -C dist wireproxy
chmod 755 dist/wireproxy
