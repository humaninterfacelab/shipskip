#!/usr/bin/env bash
set -euo pipefail

workspace_path="${1:?workspace path required}"
output_path="${2:?output path required}"

cd "$workspace_path"
npm ci
npm run build

mkdir -p "$output_path"
cp -R out/. "$output_path/"
