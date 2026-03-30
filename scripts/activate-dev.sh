#!/usr/bin/env bash

if [[ "${BASH_SOURCE[0]:-}" == "$0" ]]; then
  echo "Run this script with: source scripts/activate-dev.sh" >&2
  exit 1
fi

# When sourced from zsh, BASH_SOURCE may not point at this file. Prefer the
# current directory if the user already cd'd into the project.
if [[ -f "$PWD/.nvmrc" && -f "$PWD/package.json" ]]; then
  PROJECT_ROOT="$PWD"
else
  PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
fi
NODE_VERSION="$(tr -d '[:space:]' < "$PROJECT_ROOT/.nvmrc")"
NODE_BIN_DIR="$HOME/.nvm/versions/node/v$NODE_VERSION/bin"

export PATH="$NODE_BIN_DIR:/opt/homebrew/bin:/usr/local/bin:$PATH"

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
  nvm use "$NODE_VERSION" >/dev/null 2>&1 || true
fi

if [[ -d "$NODE_BIN_DIR" ]]; then
  export PATH="$NODE_BIN_DIR:$PATH"
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

echo "Activated bill-main dev environment in $PROJECT_ROOT"
echo "Node: $(command -v node 2>/dev/null || echo missing)"
echo "npm:  $(command -v npm 2>/dev/null || echo missing)"
echo "npx:  $(command -v npx 2>/dev/null || echo missing)"
