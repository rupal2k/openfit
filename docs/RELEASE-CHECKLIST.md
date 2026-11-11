# Release checklist — Android manual regression

Run on a real device with the **signed release APK**, installed over the previous release (data must survive). Copy this note per release and tick it. Items come from the code paths and past audit regressions; the older matrix is in `reports/test_plan_2026-10-27.md`.

## 0. Build and install
- [ ] `versionCode` > previous and `versionName` = `frontend/package.json` version; Settings shows the same version
- [ ] Unit tests and web build green in CI (`test-api`, `test-build`)
- [ ] APK signed with the release key: installs **over** the previous release and data is intact
- [ ] Release notes give the versionCode and certificate SHA-256
- [ ] `git status` clean: no uncommitted native changes left out (e.g. `file_paths.xml`, `build.gradle`)

## 1. Launch, storage, offline
- [ ] Cold start restores data (from `openfit-state.json`); force-stop and relaunch keeps last change
- [ ] Airplane mode: app opens, planned workout shows cached exercise pictures/animations; uncached ones show a placeholder, not a broken image
- [ ] Airplane mode: food search says it needs internet and offers New food
- [ ] No network requests outside jsDelivr / Hugging Face / Open Food Facts (CSP)

## 2. Navigation, back button and sheets
- [ ] Android back closes the top sheet, then goes back a route, then exits from Home
- [ ] Actions right after closing a sheet work: "Choose a different workout", skipping weigh-in, Discard/confirm don't bounce back
- [ ] Tab bar labels don't split words at the largest system font size; template tabs wrap
- [ ] Light theme: status-bar icons dark, accent text readable; dark theme: icons light

## 3. Home
- [ ] Welcome card on a fresh install offers gym / home / home gym plans
- [ ] Hero card shows today's routine, rest day, or active workout; week rings correct
- [ ] First weigh-in button names the weight; chart updates

## 4. My Plan
- [ ] Each template group (Gym / Home / Home gym / Intervals) loads; interval and Mobility plans don't change the week
- [ ] Routine editor: Format (Standard/Tabata/EMOM/AMRAP), AMRAP cap, per-routine rest; huge values are bounded
- [ ] Floating Start on a routine's page starts **that** routine
- [ ] Share plan → share sheet; import the file → merges, nothing overwritten; malformed plan file is rejected without breaking My Plan
- [ ] CSV/JSON plan upload works; files over 20 MB refused

## 5. Workout logging and timers
- [ ] Weights pre-filled; invalid set (0 reps/0 kg/0 s) can't be ticked; typo prompt "Log anyway?"
- [ ] Rest timer −15/+15/Skip; per-routine rest used
- [ ] Timed set: work timer beeps **and vibrates**, ticks itself; ending early logs held time and does not shorten next target
- [ ] Circuit: next move starts automatically; manual tick takes over
- [ ] Tabata 20/10 runs the block with its own interval length; EMOM beeps each minute, early Done doesn't save 5 s; AMRAP clock + Round done + round count
- [ ] Screen stays awake during a workout (Keep screen awake on), released after finish
- [ ] Finish: PRs and e1RM shown; Discard leaves working weights unchanged

## 6. Exercises library
- [ ] Search and body-part/equipment filters; detail sheet animation; add to routine; custom exercise
- [ ] "Ready-made workouts" chips open the plan catalogue

## 7. My Stats and History
- [ ] Muscle map (incl. hard-sets mode), effort card, heatmap, body weight, exercise curves render with data and when empty
- [ ] History opens a past workout (sets, PRs); Delete asks first and removes it

## 8. My Meals
- [ ] Targets sheet computes calories/macros; manual override
- [ ] Food search (online) adds an entry; custom food; portion units (serving/g/oz/ml)
- [ ] **Barcode scan:** camera permission prompt, rear camera preview, EAN/UPC detected and looked up; deny permission → manual entry still works
- [ ] **Photo logging:** model download shows progress, can cancel/delete; after download works offline
- [ ] **Take photo opens the camera** (not the gallery) and returns the photo
- [ ] **Choose photo shows a preview** of the picked image, then Recognise → review → save
- [ ] Retake clears the preview

## 9. Blood tests (Labs)
- [ ] Open from My Stats; screenshots/screen recording blocked and recents preview blank; leaving the screen lifts the block elsewhere
- [ ] **PDF import** (digital report): values read in about a second, review sheet, date filled
- [ ] **Scanned PDF import**: OCR progress, Cancel stops it
- [ ] **Photo import** via camera icon: camera opens, OCR runs offline, flagged rows unticked, date asked if missing
- [ ] Review: edit value with decimal comma, Save/Cancel pinned, discard asks first
- [ ] Charts with High/Low; SI/US switch; scores appear only with complete inputs
- [ ] Oversized file (>25 MB) or huge photo refused with a message

## 10. Settings, notifications
- [ ] Language switch (try hi and zh) re-renders; exercise instructions switch (en fallback for de/pt)
- [ ] Unit switch changes label only
- [ ] Workout-day reminder: permission asked only on toggle; notification fires on a planned weekday at the set time (exact alarm if allowed)
- [ ] Effort per set Off/RIR/RPE column appears/disappears; history unchanged

## 11. Backup, import, export
- [ ] Export backup → share sheet → save to Files/Drive; only the latest export kept in cache
- [ ] Import that backup on a fresh install restores everything (workouts, meals, lab reports, settings)
- [ ] Import non-OPENFIT JSON → clear error; >20 MB → refused
- [ ] Import from another app (Strong/Hevy/FitNotes CSV, Apple Health XML): summary counts dropped sets and ratings
- [ ] Reset everything wipes data after confirmation

## 12. Privacy
- [ ] Settings → "All data stays on this phone"; no sign-in screen in the app
- [ ] (Android 12+) device-to-device transfer copies data; cloud backup does not include it (spot check via `adb shell bmgr` optional)

## Rules for every build
- The **Android smoke** workflow (`.github/workflows/android-e2e.yml`, `frontend/e2e/smoke.sh`) must pass on the PR: app starts on an emulator, every tab renders, Take a photo opens a camera app. Run `bash frontend/e2e/smoke.sh <apk>` against a phone too. (no exceptions)
- Run the WHOLE list, every module, not only what changed. Record pass/fail per item with the device and build.
- Test on two brands: Samsung (S21 FE) and Nothing Phone 1. "Take photo" must open each phone's own camera.
- Native paths (camera, gallery picker, file picker, share sheet, notifications, back button) are driven through the real
  Android UI with taps. Never feed files with Playwright `set_input_files` for these: it skips the native picker, and
  that's how the 1.6.0 camera and gallery bugs shipped.
- A debug build (`com.rupal2k.openfit.dbg`, installs next to the release app) gives WebView console logs over CDP.
  Check them for errors on every flow.
- Any change to native config (FileProvider paths, manifest, permissions, CSP) means re-testing every feature that
  touches it on both phones.
- One release, only after every item passes on the signed release APK installed over the previous release.
