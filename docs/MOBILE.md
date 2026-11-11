# Building the mobile app (iOS / Android)

openfit ships in two flavors from the same codebase:

| | **Self-hosted** (this repo's default) | **Mobile app** (`VITE_MOBILE=1`) |
|---|---|---|
| Runs | in any browser, against your own server | natively on iPhone / Android (Capacitor shell) |
| Accounts | passkey sign-in, one profile per person | none — the phone *is* the account |
| Data | synced to your server, readable on desktop | stays on the device (file in the app's private storage) |
| Reminders | Web Push from your server | native local notifications, no server involved |
| Exercise media | served by your server (`img/`, `gif/`) | loaded from the jsDelivr CDN (pinned dataset commit); planned exercises cached for offline (`lib/media-cache.js`) |
| Food search | through the server's `/api/food/search` proxy | straight to Open Food Facts (CapacitorHttp skips CORS) |
| Blood tests, food photo recognition | on device in both flavors | same |

The mobile flavor never talks to a backend: no sign-in screen, no sync, no telemetry. Its
only network peers are Open Food Facts, jsDelivr (exercise media, ONNX runtime) and Hugging
Face (food model, once, on request).
State is mirrored from `localStorage` into `openfit-state.json` in the app's private data
directory on every change (iOS is allowed to evict WebView storage under pressure — the
file mirror is the durable copy and is restored on launch). Backups go out through the
OS share sheet instead of a browser download.

## Native configuration (change with care)

Every item here has broken a release when touched without a full on-device retest
(`docs/RELEASE-CHECKLIST.md`, "Rules for every build").

| File | What it does |
|---|---|
| `android/app/src/main/AndroidManifest.xml` | permissions `INTERNET`, `VIBRATE`, `SCHEDULE_EXACT_ALARM`, `CAMERA` (camera feature optional); `<queries>` for `IMAGE_CAPTURE` so Take photo finds the camera app on Android 11+; FileProvider `${applicationId}.fileprovider` (not exported); `allowBackup` with the two rule files below |
| `res/xml/file_paths.xml` | `external-files-path Pictures/` (Capacitor's file chooser writes camera photos there; without it Take photo silently opens the gallery) and `cache-path .` (share-sheet exports) |
| `res/xml/backup_rules.xml`, `res/xml/data_extraction_rules.xml` | exclude all app data from cloud backup (Android 6–11 and 12+); device-to-device transfer still copies it on 12+ |
| `java/.../MainActivity.java` | registers `PrivacyScreenPlugin`; Back goes through WebView history, then exits |
| `java/.../PrivacyScreenPlugin.java` | `PrivacyScreen.set({on})` toggles `FLAG_SECURE`; `views/Labs.jsx` turns it on while blood-test results are shown |
| `capacitor.config.json` | `appId com.rupal2k.openfit`, `allowMixedContent: false`, `CapacitorHttp` enabled |
| `android/app/build.gradle` | `versionCode`/`versionName`; release signing from git-ignored `keystore.properties` (unsigned build when absent); debug builds use the `.dbg` id suffix and install beside the release app |
| `frontend/index.html` | the CSP `<meta>` (network: self, jsDelivr, Hugging Face, Open Food Facts) |

Capacitor plugins in use: Filesystem (state file, exports), Share, LocalNotifications
(reminder), StatusBar (icon colour follows the theme), plus the local PrivacyScreen plugin.
The service worker is not registered in the mobile build (`main.jsx`).

### Camera, gallery and file pickers

- File inputs: Labs PDF (`application/pdf`), Labs camera and food Take photo
  (`image/*`, `capture="environment"`), food Choose photo (`image/*`), plan/backup/app imports.
- Read the picked file **before** clearing the `<input>`: on Android, clearing it revokes the
  WebView's access to the picked `content://` file.
- Picker files can be read only once on Android WebView: images go through `readOnce()`
  (`lib/mobile.js`) and every later step works on the in-memory copy.
- Size checks come before the read: 20 MB for text imports (`tooBig`), 25 MB for a lab file.
  The food photo has no size check before `readOnce` (it is shrunk to 512 px afterwards).
- Test these only through the real Android picker UI; `set_input_files`-style automation
  skips the native picker (how the 1.6.0 camera and gallery bugs shipped).

## Prerequisites

- Node 20+
- **Android:** Android Studio (bundles the SDK). Java 21 for Gradle.
- **iOS:** a Mac with Xcode 15+ and CocoaPods (`brew install cocoapods`). A free Apple ID
  is enough to run the app on your own iPhone (see below); paid membership is only needed
  for App Store distribution, which openfit doesn't do.

## Build & run

```sh
cd frontend
npm install
npm run build:mobile        # VITE_MOBILE build + `cap sync` into android/ and ios/

npx cap open android        # opens Android Studio → run on emulator or device
npx cap open ios            # opens Xcode (Mac only) → set your signing team, then run
```

`npm run build:mobile` bakes the CDN media base into the bundle and copies the web build
into both native projects — re-run it after every web-code change before building natively.

> **Heads-up:** after `build:mobile`, `frontend/dist` contains the *mobile* bundle.
> Run a plain `npm run build` again before deploying `dist` to a server.

## App icons & splash screens

`assets/icon-source.png` is the master icon: a rounded-square logo on a transparent
background. One script builds every icon and splash screen from it (Android launcher,
round and adaptive icons, Android and iOS splash, PWA and website icons, favicon, README
logo and banner):

```sh
cd frontend && npm install && cd ..
node scripts/generate-brand.mjs
```

To change the logo, replace `assets/icon-source.png` (keep the background transparent)
and run the script again.

## Distribution — deliberately no app stores

openfit's mobile app is not on the Play Store or App Store, and that's a choice: no store
accounts, no store rules, no yearly fees between you and an open-source app.

### Android — sideload the APK

To build and sign your own:

```sh
cd frontend && npm run build:mobile
cd android && ./gradlew assembleRelease            # → app/build/outputs/apk/release/app-release-unsigned.apk

# one-time: create a keystore. KEEP IT — updates must be signed with the same key,
# or Android refuses to install the new version over the old one.
keytool -genkeypair -keystore my.keystore -alias openfit -keyalg RSA -validity 10950

# align + sign (zipalign/apksigner ship with the Android SDK build-tools)
zipalign -f -p 4 app-release-unsigned.apk aligned.apk
apksigner sign --ks my.keystore --ks-key-alias openfit --out openfit.apk aligned.apk
```

### iPhone — what's actually possible

Apple does not allow installing apps outside the App Store, so there is no `.ipa` download
that would simply install. Your free options:

- **Self-host + PWA** (recommended): open your instance in Safari → Share → *Add to Home
  Screen*. Full-screen app, no expiry, plus sync and passkeys.
- **Xcode free signing:** open `ios/` in Xcode with a free Apple ID as the team and run it
  onto your own iPhone. Apple expires the signature after 7 days; re-run from Xcode to renew.
- **AltStore:** automates that 7-day re-signing over Wi-Fi via a Mac companion app.

### Release notes for maintainers

- Bump `versionName`/`versionCode` in `android/app/build.gradle` per release; keep them in
  step with `frontend/package.json`. `versionCode` must strictly increase or updates won't
  install over an existing APK (current: versionCode 18, 1.6.2).
- Before every build: the full on-device regression in `docs/RELEASE-CHECKLIST.md` on the
  signed release APK installed over the previous release, on both test phones.
- **License:** openfit is AGPL-3.0, which by itself sits badly with app-store terms of
  service. `NOTICE.md` carries an app-store exception (an additional permission under
  AGPL §7) granted by the copyright holders — relevant only if store distribution ever happens.
- The app requests notification permission only when the workout-day reminder is switched
  on, and (on Android) declares `SCHEDULE_EXACT_ALARM` so the reminder fires to the minute
  where the user allows it. Where exact alarms aren't allowed, the manifest comment says the
  plugin falls back to inexact alarms (plugin behaviour; not verified from this repo's code).
