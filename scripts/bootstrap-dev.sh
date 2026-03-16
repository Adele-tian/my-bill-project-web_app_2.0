#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_VERSION="$(tr -d '[:space:]' < "$PROJECT_ROOT/.nvmrc")"
NODE_BIN_DIR="$HOME/.nvm/versions/node/v$NODE_VERSION/bin"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
  nvm install "$NODE_VERSION"
  nvm use "$NODE_VERSION" >/dev/null
elif [[ -d "$NODE_BIN_DIR" ]]; then
  export PATH="$NODE_BIN_DIR:$PATH"
else
  echo "Node $NODE_VERSION is not installed. Install nvm or add Node manually." >&2
  exit 1
fi

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

if command -v brew >/dev/null 2>&1; then
  HOMEBREW_NO_AUTO_UPDATE=1 brew install watchman cocoapods || true
fi

cd "$PROJECT_ROOT"
npm install
npx expo install expo-file-system expo-image-picker expo-secure-store

cat <<EOF

Bootstrap complete.

Use this project with:
  source "$PROJECT_ROOT/scripts/activate-dev.sh"

Then start the app with:
  npm run start:local
  npm run ios
  npm run android
  npm run web
EOF
