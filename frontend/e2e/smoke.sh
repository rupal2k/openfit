#!/usr/bin/env bash
# On-device smoke test for the debug APK, run on an Android emulator in CI (and runnable on a
# phone with adb). It drives the real UI through uiautomator, so it covers what unit tests and
# browser tests cannot: the app starting in the WebView, the tab bar, and "Take a photo" handing
# off to a camera app (1.6.0 shipped opening the gallery instead).
#   usage: e2e/smoke.sh path/to/app-debug.apk
set -euo pipefail
APK="$1"
PKG=com.rupal2k.openfit.dbg
fail() { echo "SMOKE FAIL: $*"; adb exec-out screencap -p > smoke-fail.png 2>/dev/null || true; exit 1; }
dump() { adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true; adb shell cat /sdcard/ui.xml 2>/dev/null; }
# centre of the first node whose text or content-desc starts with $1 (exactly $1 when $2 = exact)
bounds() { local m="$1[^\"]*"; [ "${2:-}" = exact ] && m="$1"; dump | grep -oE "(text|content-desc)=\"$m\"[^>]*bounds=\"\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]\"" | head -1 \
  | grep -oE '\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]' | sed -E 's/\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]/\1 \2 \3 \4/'; }
tap() {
  local b; for i in $(seq 1 20); do b=$(bounds "$1" "${2:-}"); [ -n "$b" ] && break; sleep 1; done
  [ -n "$b" ] || fail "no '$1' on screen"
  set -- $b; adb shell input tap $(( ($1 + $3) / 2 )) $(( ($2 + $4) / 2 )); sleep 2
}
expect() { for i in $(seq 1 20); do dump | grep -q "$1" && { echo "ok: $1"; return; }; sleep 1; done; fail "expected '$1'"; }
top() { adb shell dumpsys activity activities | grep -m1 -E 'topResumedActivity|mResumedActivity'; }

adb install -r "$APK" >/dev/null
adb shell pm grant $PKG android.permission.CAMERA || true
adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 12
expect 'text="Home"'
# tab labels exactly: the Exercises page also has a "Home" plan chip
for tab in "My Plan" "My Stats" "My Meals" "Exercises" "Home"; do tap "$tab" exact; expect "text=\"$tab\""; done
echo "ok: every tab renders"

tap "My Stats" exact
tap "Blood tests"
expect 'Take a photo'
tap "Take a photo"
sleep 4
T=$(top); echo "after Take a photo: $T"
echo "$T" | grep -qiE 'photopicker|documentsui' && fail "Take a photo opened the gallery/file picker, not a camera"
echo "$T" | grep -qi "$PKG" && fail "Take a photo did not hand off to any camera app"
echo "ok: Take a photo opened a camera app"
adb shell input keyevent 4; sleep 2
echo "SMOKE PASS"
