#!/usr/bin/env bash
set -euo pipefail

output_path="${1:?output path required}"

cd "$(dirname "${BASH_SOURCE[0]}")"

bun install
bun run build

rm -rf "$output_path"
mkdir -p "$output_path"
cp -R out/. "$output_path/"
