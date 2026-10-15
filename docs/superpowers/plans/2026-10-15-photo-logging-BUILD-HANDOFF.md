# Build Handoff: On-Device Photo Food Logging

**Date:** 2026-10-15
**Status:** the plan is written but the build has **not started**. Wait for the owner (Rupal) to say "go" before starting Task 1.
**Plan to execute:** [`2026-10-15-on-device-photo-food-logging.md`](2026-10-15-on-device-photo-food-logging.md). It contains 10 tasks with full code, tests and commit steps. Follow it task by task. Don't redesign it.

---

## 1. What is being built (one paragraph)

The user takes or picks a meal photo in OPENFIT. A small vision-language model, **SmolVLM-256M or 500M from Hugging Face**, downloaded once by the user and run **on the device**, lists the foods and estimates grams. Calories and macros come from a **bundled USDA table**, never from the model. The user reviews and edits the list before anything is logged. The architecture is adapted from fud-ai's Android on-device stack (MIT): https://github.com/apoorvdarshan/fud-ai. The plan's "Background" section maps fud-ai's classes onto OPENFIT files.

## 2. Repo and branch state

| Item | Value |
|---|---|
| Repo | `~/openGym` (GitHub: `rupal2k/openfit`, remote name **`openfit`**; `origin` is the upstream fork) |
| Branch | `openfit-main`, pushed to `openfit/main` |
| HEAD at handoff | `6f8a354 feat(branding): new OPENFIT icon everywhere, refreshed README and screenshots` |
| Uncommitted | only the two plan docs in `docs/superpowers/plans/` (this file and the plan) |
| Tests at handoff | `cd frontend && npx vitest run` → **217 passed** |
| Second worktree | `~/openfit-qa` on the old `android/openfit` branch. **Don't build there** |

**Before Task 1:** create a feature branch so `main` stays releasable:
```bash
cd ~/openGym && git switch -c feat/photo-logging
git add docs/superpowers/plans/2026-10-15-on-device-photo-food-logging.md docs/superpowers/plans/2026-10-15-photo-logging-BUILD-HANDOFF.md
git commit -m "docs(vision): implementation plan and build handoff for on-device photo logging"
```

## 3. ⚠️ Concurrency warning

Earlier on 2026-10-15, **another agent committed in the same `~/openGym` worktree** while a second session was editing (commits `70c1ff3`, `b84bd07`). Its commits swept up the other session's uncommitted files.
- Only one agent should work in `~/openGym` at a time. If parallel work is needed, use `git worktree add ../openfit-photo feat/photo-logging`.
- Run `git status` and `git log -3` before each task. If HEAD moved unexpectedly, stop and tell the owner.

## 4. Toolchain (verified on this laptop)

| Tool | Location / command |
|---|---|
| Node | v24.21.0 (nvm) |
| Unit tests | `cd frontend && npx vitest run` (node env; `crypto.subtle` is available) |
| Web dev server | `cd frontend && npx vite --port 5173` |
| Web build | `cd frontend && npm run build` |
| Mobile web bundle + Capacitor sync | `cd frontend && npm run build:mobile` |
| APK | `cd frontend/android && JAVA_HOME=~/.jdks/jdk-21 ANDROID_HOME=~/Android/Sdk ./gradlew -q assembleDebug` → `app/build/outputs/apk/debug/app-debug.apk` |
| Install on phone | `~/Android/Sdk/platform-tools/adb install -r <apk>` (copy kept at `~/openfit-debug.apk`) |
| Phone screenshot | `~/Android/Sdk/platform-tools/adb exec-out screencap -p > shot.png` |
| Phone Chrome → laptop dev server (secure context, so WebGPU allowed) | `adb reverse tcp:5173 tcp:5173`, then open `http://localhost:5173/...` on the phone |
| Inspect the app's WebView | Chrome on laptop → `chrome://inspect` |
| Android emulator | **Removed on purpose.** Test on the real phone only |

**Test phone:** Samsung Galaxy **S21 FE** (SM-G990B2), serial `RZCW91TXZ4R`, app ID `com.rupal2k.openfit`.
- If `adb devices` is empty, check `lsusb` for "Samsung". If it isn't listed, the cable is charge-only: ask the owner to replug or use another cable.
- Samsung Secure Folder (user 150) causes a harmless `SecurityException` on `pm list packages`.

## 5. Prerequisites the owner must provide

1. **"Go"** to start.
2. **USDA FoodData Central API key** (free: https://fdc.nal.usda.gov/api-key-signup), needed in Task 4 Step 6: `FDC_API_KEY=… node scripts/build-generic-foods.mjs`. Never commit the key.
3. **About 10 real meal photos** for the Task 1 spike: rice + dal + curry, roti, biryani, eggs, fruit, salad, pizza, a drink, a packaged snack, a mixed plate. Phone photos are fine. Don't commit them to the repo.
4. The phone, connected over USB, for Task 1 Step 4 and Task 9.

## 6. Execution order and gates

```
Task 1  spike (needs photos + phone)  ──▶  GATE: owner reviews docs/superpowers/notes/2026-10-15-photo-spike.md
          decision → DEFAULT_MODEL = smolvlm-256m | smolvlm-500m | fallback-food101
Task 2  catalog + errors        (TDD)    ─┐
Task 3  prompt + parser         (TDD)     │  independent; any order
Task 4  USDA table + matcher    (TDD, needs FDC key)
Task 5  image + verify helpers  (TDD)    ─┘
Task 6  worker + lifecycle client (needs Tasks 2, 3, 5) + manual console check
Task 7  analyzeMeal pipeline   (needs Tasks 3, 4)
Task 8  UI + entry points      (needs Tasks 2, 5, 6, 7) → full suite + build
Task 9  device QA matrix (16 rows) ──▶  GATE: owner signs off
Task 10 README + NOTICE
```
- Commit after every task with the message given in the plan, ending with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Push** to GitHub (`git push openfit …`) **only when the owner asks.**
- After Task 8 and after Task 9, build and install the APK and send the owner a phone screenshot.

## 7. Facts already checked (don't re-research)

- **Models and pins:**
  - `HuggingFaceTB/SmolVLM-256M-Instruct` @ `7e3e67edbbed1bf9888184d9df282b700a323964`
  - `HuggingFaceTB/SmolVLM-500M-Instruct` @ `a7da5b986cb59b408707209984f360a5f4ad7e47`
  - Per-file bytes and sha256 are already in Task 2's `catalog.js` (from the HF API).
- **Runtime:** `@huggingface/transformers` **4.3.1** (latest on 2026-10-15). It supports SmolVLM/Idefics3 and WebGPU, and caches files in Cache Storage `transformers-cache` under `https://huggingface.co/<repo>/resolve/<sha>/<file>`. **Task 1 must confirm this key format**, because Tasks 2 and 6 depend on it.
- **Download sizes:** 256M ≈ 211–214 MB; 500M ≈ 380–395 MB (WebGPU vs WASM file sets).
- **Fallback model:** `onnx-community/swin-finetuned-food101-ONNX` @ `e5e50bfc6425aa546f3b4421ca8bd79d0dd610b8`, `model_q4f16.onnx` (52.7 MB).
- **fud-ai's on-device Android setup (for Phase 2):** LiteRT-LM `0.18.0`, `litert-community/gemma-4-E2B-it-litert-lm` @ `6b78abd…`, 2,588,147,712 bytes, sha256 `181938105e0e…`, needs ≥8 GB RAM.

## 8. Known pitfalls

- **CapacitorHttp is enabled** (`frontend/capacitor.config.json`). It patches `window.fetch`, which would push a 200 MB model download through the native bridge. **All model fetching must happen inside the Web Worker** (`lib/vision/worker.js`), whose `fetch` is not patched. Don't call transformers.js on the main thread.
- **WebView WebGPU and WASM threads:** the APK WebView may lack WebGPU and isn't cross-origin isolated, so WASM runs single-threaded and slowly. Task 1 measures this. Don't add COOP/COEP headers as a workaround without asking.
- **`navigator.deviceMemory`** is rounded down and capped at 8 (the 6 GB S21 FE may report 4). Treat `undefined` as allowed.
- **Circular import:** `vision-sheets.jsx` imports `MEAL_LABEL` from `nutrition-sheets.jsx`, so `nutrition-sheets.jsx` must load `vision-sheets.jsx` with a **dynamic** `import()` (Task 8 Step 4).
- **Portion code was reworked by another agent** (`b84bd07`): `toGrams`/`fromGrams` take a `serving` argument and there are `serving`/`portion` units. Photo logging stores plain grams (`u` unset), so this needs no change. Don't refactor it.
- **UI conventions:**
  - The app name displays as **OPENFIT** (all caps).
  - Tabs are Home / My Plan / My Stats / My Meals / Exercises.
  - The Start-workout bubble floats bottom-right.
  - Keep accepted layouts as they are; fix spacing only inside the existing layout.
- **i18n:** wrap every new string in `t()`. English fallback is fine; don't edit the 11 locale files.
- **Owner preference:** before adding anything **not in the plan**, explain it and its impact on existing features, and get a yes first.

## 9. Definition of done

- [ ] Tasks 1–10 checked off in the plan, with one commit per task on `feat/photo-logging`.
- [ ] `npx vitest run`: 217 existing tests plus all new vision tests pass. `npm run build` succeeds, and the main JS chunk does not contain ONNX Runtime.
- [ ] The Task 9 QA matrix is recorded with all 16 rows passing on desktop Chrome and the S21 FE APK, including offline analysis.
- [ ] No image bytes in any network request (check DevTools Network during an analysis: no requests at all).
- [ ] README and NOTICE updated.
- [ ] The owner has seen phone screenshots and approved. Merge or push only on their instruction.
- [ ] Obsidian project note updated: `/home/rupaldas/Documents/Calude Vault/openfit.md` (the folder name really is "Calude").

## 10. Who to ask

The owner, Rupal (GitHub `rupal2k`). Stop and ask when:
- a gate is reached;
- the spike misses the decision bar for every option;
- HEAD moves unexpectedly;
- a task needs something outside the plan.
