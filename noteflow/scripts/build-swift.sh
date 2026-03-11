#!/bin/bash
# =============================================================================
# build-swift.sh — Compile the AudioCapture Swift helper binary
#
# Usage:
#   ./scripts/build-swift.sh           # builds into resources/AudioCapture
#   ./scripts/build-swift.sh --release # optimised release build
#
# Requirements:
#   - macOS 13+ (ScreenCaptureKit API)
#   - Xcode Command Line Tools (xcode-select --install)
#
# The built binary must be codesigned with the screen-capture entitlement.
# In development, ad-hoc signing is used (no Apple Developer account needed).
# For distribution, replace CODESIGN_ID with your Developer ID Application.
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SWIFT_SRC="$PROJECT_ROOT/swift/AudioCapture"
OUTPUT_DIR="$PROJECT_ROOT/resources"
OUTPUT_BINARY="$OUTPUT_DIR/AudioCapture"
ENTITLEMENTS="$PROJECT_ROOT/swift/AudioCapture.entitlements"

# Detect release vs debug
BUILD_CONFIG="-O"        # optimise
if [[ "$1" == "--debug" ]]; then
  BUILD_CONFIG=""
fi

echo "🔨 Building Swift AudioCapture helper..."
echo "   Source: $SWIFT_SRC"
echo "   Output: $OUTPUT_BINARY"

# Compile all .swift files in the source directory
swiftc \
  $BUILD_CONFIG \
  -target arm64-apple-macosx13.0 \
  -framework Foundation \
  -framework AVFoundation \
  -framework ScreenCaptureKit \
  -framework CoreMedia \
  "$SWIFT_SRC/ScreenAudioCapture.swift" \
  "$SWIFT_SRC/AudioChunker.swift" \
  "$SWIFT_SRC/main.swift" \
  -o "$OUTPUT_BINARY"

echo "✅ Compiled binary: $OUTPUT_BINARY"

# ---------------------------------------------------------------------------
# Codesign with screen-capture entitlement
# ---------------------------------------------------------------------------
#
# For development: ad-hoc signing (- identity) + entitlements
# For distribution: replace "-" with "Developer ID Application: Your Name (TEAMID)"
#
CODESIGN_ID="-"   # ad-hoc

if [ -f "$ENTITLEMENTS" ]; then
  echo "🔐 Codesigning with entitlements: $ENTITLEMENTS"
  codesign \
    --force \
    --sign "$CODESIGN_ID" \
    --entitlements "$ENTITLEMENTS" \
    --options runtime \
    "$OUTPUT_BINARY"
  echo "✅ Codesigned"
else
  echo "⚠️  Entitlements file not found at $ENTITLEMENTS — skipping codesign"
  echo "   The binary will run but screen capture permission may fail."
fi

echo ""
echo "Done! Run 'npm start' to test."
echo "On first run, macOS will ask for Screen Recording permission."
