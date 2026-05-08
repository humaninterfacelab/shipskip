#!/bin/bash

set -e

if [ -z "$1" ]; then
  echo "Usage: ./build.sh <base-directory>"
  exit 1
fi

BASE_DIR="$1"

BUILD_DIR="$BASE_DIR/build"
APP_ARCHIVE="$BASE_DIR/app.tar.gz"

echo "Installing dependencies..."
bun install

echo "Building Next.js app..."
bun run build

echo "Building static website..."
mkdir -p "$BUILD_DIR"

rsync -av --delete out/ "$BUILD_DIR/"

echo "Committing app source..."
git add .
git commit -m "Agent changes"

echo "Creating app archive..."
git archive \
  --format=tar.gz \
  --output="$APP_ARCHIVE" \
  HEAD

echo "Done!"
echo ""
echo "Build : $BUILD_DIR"
echo "Source: $APP_ARCHIVE"
