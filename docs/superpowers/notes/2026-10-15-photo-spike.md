# Photo recognition spike: results (Task 1)

**Date:** 2026-10-15
**Run by:** Claude (continuing after the other agent, which skipped Task 1)
**Environment:** laptop, headless Chromium (playwright chromium-1234) → `frontend/lab/*.html` on the Vite dev server.
`webgpu: true · crossOriginIsolated: false · cores: 8 · deviceMemory: 16`

**Not yet run:** phone Chrome and the phone WebView (the S21 FE was not connected). Every phone number below is therefore unknown, and phone WASM will be several times slower than the laptop.

**Photos:** 10 test images, kept locally and not committed:
- 3 from Food-101 validation: caesar salad, fried rice, hamburger (the hamburger was downloaded but not used in the runs)
- the rest from Wikimedia Commons: dal + rice + bhindi + chapati plate, mutton biryani, boiled eggs with tomato, bananas, pizza slices, chicken curry bowl, samosa, omelette

**Prompt:** the plan's `BASE_PROMPT`. **Decoding:** greedy, 160 new tokens, repetition_penalty 1.1.

## Cache key format: ✅ matches the plan

`https://huggingface.co/HuggingFaceTB/SmolVLM-256M-Instruct/resolve/7e3e67edbbed1bf9888184d9df282b700a323964/onnx/decoder_model_merged_q4.onnx`

Exactly what Task 2's `fileUrl()` produces.
⚠️ In the 500M + WebGPU run the cache listing came back **empty**, so the files may not have been persisted. Investigate before relying on Cache Storage for 500M.

## SmolVLM-256M, WASM (load 71 s, first run includes the download)

| Photo | Reply (trimmed) | s | Main food right? | Grams given? |
|---|---|---|---|---|
| dal_rice | 2 pieces of bread on top of mashed potatoes. | 21.2 | partial (bread≈chapati) | no |
| biryani | The rice is piled high… | 22.8 | yes (rice) | no |
| boiled_eggs | 1 egg, 2 ketchup wedges, 3 pieces of onion, … | 35.7 | yes | no |
| banana | The question is answering the image. | 20.0 | no | no |
| pizza | The pizza is mostly white and green… | 19.3 | yes | no |
| chicken_curry | 2 eggs + carrot pieces + peas… | 19.8 | no | no |
| samosa | 20g of bread bun, 1 cup of tomato sauce. | 19.4 | no | partial |
| omelette | 1 cup of cottage cheese and butter… | 18.9 | no | no |
| caesar_salad | 1 cup salad with celery and croutons… | 20.8 | yes | no |
| fried_rice | 10g of rice and peas… | 28.4 | yes | yes (implausible) |

**Score:** 5/10 main food (1 partial), 0–1/10 usable grams, about 20 s per photo on the laptop CPU. **Fails** the bar (7/10, 5/10, ≤25 s on the phone).

## SmolVLM-500M, WebGPU (load 138 s incl. download)

| Photo | First lines of reply | s | Main food right? | Grams plausible? |
|---|---|---|---|---|
| dal_rice | Onion 30g, Egg 40g, Bread 30g, Cucumber 30g | 29.8 | no | no |
| biryani | Carrot 10g, Breaded chicken 20g, Parmesan 5g | 19.3 | no | no |
| boiled_eggs | Egg (3): 18-20g, Tomato slices (5) | 32.8 | yes | no |
| banana | Banana (yellow and green) ×4 (repeats) | 31.6 | yes | no grams |
| pizza | Cheese 10g, Onion 5g, Tomato 4g | 24.1 | no ("pizza" never said) | no |
| chicken_curry | Egg yolk 35g, Chicken breast 30g, … | 36.6 | partial | no |
| samosa | Bread 30g ×n (repeats) | 27.4 | no | no |
| omelette | Chicken breast 360g ×n (repeats) | 31.0 | no | no |
| caesar_salad | Croutons 60g, Coleslaw 50g, … 15 lines | 33.9 | partial | no |
| fried_rice | Shrimp 35g, Rice 40g, … repeats | 39.4 | yes | no |

**Score:** about 3/10 main food (2 partial). It follows the line format but hallucinates long lists that loop, and grams are wrong by 5–10×. 19–39 s per photo **on the laptop GPU**. **Fails** the bar.

## Fallback: Food-101 classifier (swin-finetuned-food101, int8, WASM; load 44 s)

| Photo | Top-3 | s | Top-1 right? |
|---|---|---|---|
| dal_rice | omelette 21%, hummus 14%, chicken_curry 6% | 3.5 | no (dal is not a Food-101 class) |
| biryani | chicken_curry 23%, fried_rice 21%, pad_thai 6% | 3.1 | close (rice dish in top-2) |
| boiled_eggs | deviled_eggs 100% | 2.8 | yes (egg) |
| banana | chicken_wings 5%, … | 2.5 | no (fruit is not a class) |
| pizza | pizza 100% | 2.3 | yes |
| chicken_curry | greek_salad 68%, … | 2.4 | no |
| samosa | samosa 87% | 2.5 | yes |
| omelette | omelette 98% | 2.7 | yes |
| caesar_salad | caesar_salad 100% | 2.7 | yes |
| fried_rice | fried_rice 96% | 2.9 | yes |

**Score:** 6/10 top-1 (7/10 counting eggs), about 2.5 s per photo on the CPU, 53 MB.
**Limits:** it knows only 101 mostly Western dishes (no dal, roti, plain fruit or vegetables), gives one label per photo, and returns no grams.
Its confidence is a useful signal: ≥85% was right every time, and ≤25% was wrong or ambiguous.

## Decision (pending the owner)

Under the plan's decision rule, **both SmolVLM sizes fail**, so the fallback applies: **`fallback-food101`**.
See the options presented to the owner in chat. **The build is paused at this gate.**
