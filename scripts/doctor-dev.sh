#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_VERSION="$(tr -d '[:space:]' < "$PROJECT_ROOT/.nvmrc")"
NODE_BIN_DIR="$HOME/.nvm/versions/node/v$NODE_VERSION/bin"

export PATH="/opt/homebrew/bin:/usr/local/bin:$NODE_BIN_DIR:$PATH"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

if [[ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]]; then
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if [[ -d "$ANDROID_HOME/platform-tools" ]]; then
  export PATH="$ANDROID_HOME/platform-tools:$PATH"
fi

if [[ -d "$ANDROID_HOME/emulator" ]]; then
  export PATH="$ANDROID_HOME/emulator:$PATH"
fi

if [[ -d "$ANDROID_HOME/cmdline-tools/latest/bin" ]]; then
  export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
fi

echo "Project root: $PROJECT_ROOT"
echo "Expected Node: $NODE_VERSION"
echo "node: $(command -v node || echo missing)"
echo "npm: $(command -v npm || echo missing)"
echo "npx: $(command -v npx || echo missing)"
echo "watchman: $(command -v watchman || echo missing)"
echo "pod: $(command -v pod || echo missing)"
echo "adb: $(command -v adb || echo missing)"
echo "emulator: $(command -v emulator || echo missing)"

if command -v node >/dev/null 2>&1; then
  echo "node version: $(node -v)"
fi

if command -v npm >/dev/null 2>&1; then
  echo "npm version: $(npm -v)"
fi

if command -v xcodebuild >/dev/null 2>&1; then
  echo "xcode: $(xcodebuild -version | tr '\n' ' ' | sed 's/ $//')"
fi
