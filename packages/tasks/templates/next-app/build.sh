#!/bin/bash

set -e

if [ -z "$1" ]; then
  echo "Usage: ./build.sh <base-directory>"
  exit 1
fi

BASE_DIR="$1"

BUILD_DIR="$BASE_DIR/build"

echo "Installing dependencies..."
bun install

echo "Building Next.js app..."
bun run build

echo "Building static website..."
mkdir -p "$BUILD_DIR"

rsync -av --delete out/ "$BUILD_DIR/"

echo "Done!"
echo ""
echo "Build: $BUILD_DIR"
