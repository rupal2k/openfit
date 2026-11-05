# Third-party notices

openfit — Copyright (C) 2026 Rupal Das and openfit contributors.
Based upon openGym — Copyright (C) 2026 Duarte Santos.
openfit's own code is licensed under the **GNU AGPL v3.0** (see [LICENSE](LICENSE)).

## App store exception

As an additional permission under section 7 of the AGPL v3.0, the copyright holders permit
distribution of the openfit mobile application through app store platforms (such as the
Apple App Store and Google Play) whose terms of service would otherwise be incompatible
with the AGPL, provided the corresponding source code remains available under the AGPL at
the project repository. This permission applies to the distribution channel only and does
not otherwise limit the license.

## Body diagram geometry

The muscle outlines the body maps are drawn from (`frontend/src/lib/body-paths.js`) are derived
from [**MuscleMap**](https://github.com/melihcolpan/MuscleMap) by Melih Colpan, used under the
**MIT License** and reproduced below. MuscleMap ships its path data as Swift source rather than
`.svg` files; the paths were converted to a JSON module, its sub-group shapes were dropped, and
nothing else about the artwork was changed.

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Exercise data & media

The exercise names, instructions (English in `frontend/src/lib/exercises-data.js`, other
languages in `frontend/src/instr/`, regenerated via `scripts/build-instructions.mjs`), images
and animations (fetched into `media/` at build time) come from
[**hasaneyldrm/exercises-dataset**](https://github.com/hasaneyldrm/exercises-dataset)
and are **not** covered by openfit's AGPL license — they remain under that dataset's own terms.
The media files are not distributed in this repository; they are downloaded from the upstream
source on first run. If you redistribute openfit with the media included, review the upstream
license first.

## Nutrition formulas & food data

The calorie target (IOM 2005 equations, activity categories, goal adjustment) is ported from
[**OpenNutriTracker**](https://github.com/simonoppowa/OpenNutriTracker) by Simon Oppowa and
contributors, GPL-3.0 — `lib/core/utils/calc/`. Food data comes from
[**Open Food Facts**](https://world.openfoodfacts.org), © Open Food Facts contributors,
available under the Open Database License (ODbL).

## On-device food recognition

- Dish recognition model: [swin-finetuned-food101-ONNX](https://huggingface.co/onnx-community/swin-finetuned-food101-ONNX)
  (Apache-2.0), downloaded at runtime from huggingface.co at pinned commit
  `e5e50bfc6425aa546f3b4421ca8bd79d0dd610b8` and verified by SHA-256.
- [transformers.js](https://github.com/huggingface/transformers.js) by Hugging Face (Apache-2.0), with
  ONNX Runtime Web by Microsoft (MIT).
- Dish nutrition and typical portions: USDA FoodData Central, FNDDS survey foods (public domain).
- Architecture (model catalogue, verified download with a marker, GPU→CPU fallback, one analysis
  pipeline, review before logging) adapted from [fud-ai](https://github.com/apoorvdarshan/fud-ai)
  by Apoorv Darshan (MIT).

## Blood test markers and test report (getbased)

The lab-report reader (`frontend/src/lib/labs/`) follows the marker keys, canonical SI units and
unit conversion factors of [**getbased**](https://github.com/elkimek/get-based) by elkimek and
contributors, licensed under the **GNU AGPL v3.0 or later**. These are factual laboratory values;
the marker names' aliases, the parser and the scoring code are openfit's own. The PhenoAge
coefficients are from the published paper (Levine ME et al., *Aging*, 2018).

The test fixtures in `frontend/src/lib/labs/fixtures/` (`getbased-reference-us-v2.pdf` and
`.gold.json`) are getbased's synthetic reference report, copied unchanged under the AGPL v3.0 or
later. They contain no real patient or laboratory data, are used only by the test suite and are not
part of the built app, so the app store exception above is not affected by them.

## On-device OCR (Tesseract)

Photographed and scanned lab reports are read by [**Tesseract.js**](https://github.com/naptha/tesseract.js)
and [**tesseract.js-core**](https://github.com/naptha/tesseract.js-core) (the
[Tesseract OCR engine](https://github.com/tesseract-ocr/tesseract) compiled to WebAssembly), all under
the **Apache License 2.0**, with the English model from
[**tessdata**](https://github.com/tesseract-ocr/tessdata) (Apache License 2.0), packaged as
[`@tesseract.js-data/eng`](https://www.npmjs.com/package/@tesseract.js-data/eng) (MIT). The worker,
WebAssembly core and model are shipped inside the app under `ocr/` unmodified. PDF text and page
rendering use Mozilla's [**pdf.js**](https://github.com/mozilla/pdf.js) (Apache License 2.0).
