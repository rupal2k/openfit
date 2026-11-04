# PRD: OPENFIT Labs

## 1. Summary

OPENFIT Labs lets people bring their blood test reports into OPENFIT, check the values, see them change over time, and get a handful of published clinical scores. Everything runs on the person's phone or their own server. No report ever goes to an online AI service. Now is the moment because OPENFIT already holds training, body weight and food data in one private place, and blood work is the missing piece.

## 3. Background

People who lift or diet seriously get blood tests once or twice a year. The results arrive as a PDF or a printout, get looked at once, and are forgotten. Seeing a trend means typing numbers into a spreadsheet by hand.

Paid services (ByoMap, InsideTracker, Function Health) solve this by uploading the report to their cloud. OPENFIT's promise is the opposite: your data stays with you. The open-source project getbased (AGPL-3.0, the same license as OPENFIT) shows the job can be done in the browser, and gives us a tested marker catalogue, unit conversions and a synthetic benchmark report we can reuse with credit.

## 4. Objective

Make a year of blood tests as easy to follow as a year of workouts, without giving up privacy.

Key results for the first version:
- **KR1:** On the reused synthetic benchmark report (68 known values), at least 90% of rows come out with the right marker, value and unit before the person edits anything.
- **KR2:** Importing a PDF makes zero network requests (checked by an automated test), on the web app and the Android app.
- **KR3:** Every score shown matches a hand-calculated reference to 2 decimal places, in automated tests, for both mg/dL and mmol/L inputs.

OPENFIT has no telemetry, so the results are measured with tests, not usage data.

## 5. Market segments

1. **Self-hosting lifters and dieters** who already track training and food in OPENFIT and get yearly blood tests. They want their lipids, glucose and liver values next to their weight and diet. Constraint: many use the Android app with no server.
2. **Privacy-minded health trackers** who would like ByoMap-style insight but will not upload medical reports to a company. Constraint: they need to trust where each number comes from.

## 6. Value propositions

**Segment 1: self-hosting lifters and dieters**
- **Who:** people who already log training and food in OPENFIT.
- **Why:** to see whether their diet and training show up in their blood work.
- **What before:** a PDF per year in an email folder; trends need a hand-made spreadsheet.
- **How:** drop the PDF into OPENFIT, confirm the values, and every marker gets a chart next to body weight.
- **What after:** "my triglycerides fell as my weight dropped" is visible in seconds.
- **Alternatives:** spreadsheets (slow) or cloud apps (give up privacy). OPENFIT does it where the rest of their data already lives.

*Statement:* Your blood work, charted next to your training and diet, without it ever leaving your phone or server.

**Segment 2: privacy-minded health trackers**
- **Who:** people who want deeper insight from routine blood tests.
- **Why:** lab reports show "normal" or "high" but not the published scores doctors use.
- **What before:** calculate HOMA-IR or FIB-4 by hand, or upload to a paid cloud service.
- **How:** OPENFIT calculates seven published scores and a published biological-age estimate, and shows the formula and source for each.
- **What after:** clear, sourced numbers they can take to their doctor.
- **Alternatives:** ByoMap or InsideTracker (cloud, subscription). OPENFIT is free, offline and shows its working.

*Statement:* The scores your doctor uses, calculated on your own device, with the formula and the source in plain view.

## 7. Solution

### 7.1 Key flow

Labs tab → Import report (PDF) → OPENFIT reads the text on the device → review screen lists each value with its marker, unit and the lab's range → person fixes or removes rows → Save → charts and scores update.

### 7.2 Key features (first version)

- **PDF import on the device.** Text comes out with pdf.js; a rule-based reader matches lines to known markers using names and aliases. No AI model is needed.
- **Review before saving.** Nothing is stored until the person confirms it. Unmatched rows are shown, never silently dropped.
- **Marker catalogue and units.** Built from getbased's catalogue (credited in NOTICE.md); values are stored in one unit per marker and converted from mg/dL, mmol/L and similar.
- **Lab ranges first.** Each result keeps the range printed on the report. No "optimal" ranges that we cannot source.
- **History and charts.** One chart per marker over time, using OPENFIT's existing chart.
- **Clinical scores:** HOMA-IR, TG/HDL, ApoB/ApoA1, FIB-4, Non-HDL cholesterol, homocysteine and Omega-3 Index, each with formula, thresholds and source, and only when its inputs exist.
- **Biological age (PhenoAge,** Levine et al. 2018): a published formula from 9 common markers and age.
- **Sync and backup** through the existing OPENFIT state and JSON backups.

### 7.3 Technology

Plain JavaScript in the existing React app. pdf.js runs in the browser and the Android WebView. Data lives in the existing state store, so the self-hosted sync works unchanged. Tests use Vitest, like the rest of the app.

### 7.4 Assumptions and open questions

- *Assumption:* most users' reports are digital PDFs with selectable text. Scanned or photographed reports need OCR (planned for version 2).
- *Assumption:* the rule-based reader reaches KR1 on the benchmark. If it doesn't, version 2's optional local model closes the gap.
- *Open:* which real report layouts matter most to our users (Indian labs, US labs, European labs). We have no real reports to test against, only the synthetic one.
- *Open:* the scores are wellness information, not diagnosis. Wording needs care, and the app must say so.

## 8. Release

- **Version 1 (this work):** PDF import, review, catalogue and units, charts, the seven scores and PhenoAge, sync and backup.
- **Version 2:** photo and scan import with on-device OCR (Tesseract), and an optional Ollama container in Docker Compose that self-hosted installs can use for hard reports.
- **Version 3:** raw DNA import (23andMe, AncestryDNA) against getbased's graded SNP set.
- **Not doing:** online AI services, a weighted "Health Index", gut microbiome, and ancestry-adjusted ranges without checked sources.

Rough size: version 1 is about one to two weeks of focused work; versions 2 and 3 about a week each.
