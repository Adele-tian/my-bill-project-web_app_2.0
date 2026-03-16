#!/usr/bin/env bash

set -euo pipefail

PORT="${1:-8081}"
HOST="${EXPO_DEV_HOST:-127.0.0.1}"
URL="exp://$HOST:$PORT"
DEFAULT_AVD="${ANDROID_AVD_NAME:-Expo_Pixel_8_API_35}"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="/opt/homebrew/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

adb start-server >/dev/null

if ! adb devices | awk 'NR>1 && $2=="device" { found=1 } END { exit found ? 0 : 1 }'; then
  if ! pgrep -f "emulator @${DEFAULT_AVD}|qemu-system.*${DEFAULT_AVD}" >/dev/null 2>&1; then
    echo "No Android device is connected. Starting emulator: $DEFAULT_AVD"
    nohup "$ANDROID_HOME/emulator/emulator" "@$DEFAULT_AVD" >/tmp/"$DEFAULT_AVD".log 2>&1 &
  else
    echo "Waiting for Android emulator to finish booting..."
  fi

  timeout_secs=120
  start_time="$(date +%s)"
  until adb devices | awk 'NR>1 && $2=="device" { found=1 } END { exit found ? 0 : 1 }'; do
    if (( $(date +%s) - start_time >= timeout_secs )); then
      echo "Timed out waiting for an Android device after ${timeout_secs}s." >&2
      echo "Check the emulator window or start it manually, then retry." >&2
      exit 1
    fi
    sleep 2
  done
fi

adb wait-for-device >/dev/null

pm_timeout_secs=120
pm_start_time="$(date +%s)"
until adb shell pm list packages >/dev/null 2>&1; do
  if (( $(date +%s) - pm_start_time >= pm_timeout_secs )); then
    echo "Android device connected but package manager is still unavailable after ${pm_timeout_secs}s." >&2
    exit 1
  fi
  echo "Waiting for Android package manager..."
  sleep 2
done

if ! adb shell pm list packages | grep -q 'host.exp.exponent'; then
  echo "Expo Go is not installed on the Android device." >&2
  exit 1
fi

# Route the emulator/device back to the host Metro server. This avoids
# depending on LAN IP reachability, which is flaky on local emulators.
adb reverse "tcp:$PORT" "tcp:$PORT" >/dev/null

# Expo CLI sometimes uses `monkey` to open Expo Go, which can fail on some
# emulator images. Use Expo Go's explicit launcher activity instead of relying
# on package-only intent resolution.
adb shell am start -W -n host.exp.exponent/.LauncherActivity -a android.intent.action.VIEW -d "$URL" >/dev/null

echo "Opened Expo Go on Android: $URL"
