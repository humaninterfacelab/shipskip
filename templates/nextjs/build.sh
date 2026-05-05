#!/usr/bin/env bash
set -euo pipefail

output_path="${1:?output path required}"

bun install
bun run build

mkdir -p "$output_path"
cp -R out/. "$output_path/"
