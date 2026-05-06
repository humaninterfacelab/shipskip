#!/usr/bin/env bash
set -euo pipefail

output_path="${1:?output path required}"

if [[ "$output_path" != /* ]]; then
  output_path="$PWD/$output_path"
fi

output_parent="$(dirname "$output_path")"
output_path="$(cd "$output_parent" && pwd -P)/$(basename "$output_path")"
allowed_root="$(cd "${SHIPSKIP_BUILD_OUTPUT_ROOT:-${RUNNER_TEMP:-/tmp}}" && pwd -P)"

case "$output_path" in
  "$allowed_root"/*) ;;
  *)
    echo "output path must be inside $allowed_root" >&2
    exit 1
    ;;
esac

if [[ "$output_path" == "/" || "$output_path" == "$PWD" || ( -n "${HOME:-}" && "$output_path" == "$HOME" ) ]]; then
  echo "refusing dangerous output path: $output_path" >&2
  exit 1
fi

cd "$(dirname "${BASH_SOURCE[0]}")"

bun install
bun run build

rm -rf "$output_path"
mkdir -p "$output_path"
cp -R out/. "$output_path/"
