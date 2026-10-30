# Hair editing pipeline handoff — 2026-10-29

## Current state

The optimized AvalAI path is implemented in code but **is not ready to use for
paid production requests**. Python preprocessing and local composition work.
The AvalAI model catalog has been verified with the current account. A live
image edit has not succeeded yet.

## What was implemented

1. `python_service/processor.py` accepts JSON on stdin and returns JSON on
   stdout. `prepare` normalizes EXIF orientation, detects exactly one face
   with MediaPipe Face Landmarker, segments hair with MediaPipe Hair Segmenter,
   crops the target and reference, aligns the reference hair silhouette to
   the target using eye/chin landmarks, and builds an edit mask. The target
   sent to the image model is a 1024×1024 square canvas; the reference is at
   most 768 px on its long side. `compose` blends only the allowed hair area
   from the generated image into the full-resolution original photo.
2. `python_service/download_models.py` downloads Google's two official model
   assets into `python_service/models/`. That directory is Git-ignored.
3. `lib/hair-pipeline/python.ts` runs the Python processor from the Next.js
   server. It uses `.venv` automatically when present, or `PYTHON_BIN`.
4. `lib/hair-pipeline/avalai.ts` reads AvalAI `/v1/models`, caches the result
   for 10 minutes, and presents only models whose metadata advertises
   `/v1/images/edits`. Current default priority starts with GPT Image 2.5
   Flare, Sunburst, GPT Image 2, GPT Image 1.5, then FLUX edit models. It sends the target as the
   first image, the reference as the second image, and the **target hair mask**
   as `mask`. It then calls Python `compose`. The priority is configurable
   through `AVALAI_EDIT_MODEL_PRIORITY`.
5. `app/api/providers/route.ts` exposes Auto and the live AvalAI edit models;
   `app/page.tsx` defaults to Auto when available and records the used model;
   `components/ResultPreview.tsx` displays that model. The generate route
   resolves the selected model before dispatch.
6. `.env.example`, `.gitignore`, README setup instructions, and a manual live
   check script (`scripts/test-optimized-live.mjs`) were added.

## Verification performed

- `npm run build` succeeded after the initial integration. `npx tsc --noEmit`
  succeeded. Run both again after any further edits.
- `python_service/test_processor.py`: 3 passing tests for face protection,
  compact input preparation, and preserving original pixels outside the edit.
- The real MediaPipe models were downloaded locally. `prepare` ran successfully
  on the public MediaPipe portrait sample. It found one face and hair, and
  produced target, reference, and mask assets. Sample artifacts are in the
  Git-ignored `python_service/models/` directory.
- With network access, `GET /api/providers` returned Auto, GPT Image 2.5
  Sunburst, GPT Image 2.5 Flare, FLUX.2 Pro, and GPT Image 2 from the AvalAI
  account. The live catalog metadata lists `/v1/images/edits` for these.
- **No successful AvalAI edit call or final generated hairstyle was verified.**

## 2026-10-30 continuation

- Product direction for V1: prioritize reference-photo hairstyle transfer.
  The two-photo path is the default, upload guidance now matches the current
  one-face-per-image processor requirement, reference replacement takes one
  click, and generating requires a configured selected model. Recommendation
  remains a secondary mode. The result is shown first on small screens.
- The reference-edit prompt now describes the complete target portrait, assigns
  Image 1 and Image 2 distinct roles, specifies which hair traits to transfer,
  and asks the editor to fit them to the target pose and lighting. The AvalAI
  path adds its mask and square-canvas instructions. The legacy generic adapter
  now sends the reference as a second image rather than as a mask and skips
  text-only generation for this mode. Visual impact still needs live pairs.

- The model selector now posts the provider, and the generate route resolves
  selected IDs against the same advertised model lists before dispatch.
- AvalAI models now load automatically from the account catalog when they
  advertise `/v1/images/edits`. No manual cost estimate is needed. GPT and FLUX
  models are sorted near the top. Auto makes one paid attempt with a documented
  GPT edit model; GPT Image 2.5 uses medium quality. FLUX models are available
  for explicit selection when the catalog advertises edits. Successful requests
  log the AvalAI request ID and attempt an exact cost lookup. There is no preflight
  dollar cap for token-based image edits.
- FLUX.2 Pro is shown only if the account catalog advertises image edits. Its
  edit contract is still unverified because current AvalAI docs describe it as
  generation only. Do not treat catalog metadata as a successful edit test.
- Two diagnostic scripts contained hard-coded AvalAI credentials, and one also
  contained a 9Router credential. The strings were removed from the working
  tree. **Rotate those credentials** because Git history may still contain them.
- This checkout has no `.venv` or downloaded MediaPipe model assets, so the
  paid live edit check still needs local setup. Do not claim live contract or
  visual quality verification until that succeeds.
- Current verification: `npx tsc --noEmit` and `git diff --check` passed. The
  four processor unit tests passed in the previous turn. Mocked catalog data
  showed GPT and FLUX entries as available. A read-only request to the actual
  AvalAI account returned HTTP 200; the account advertises edits for GPT Image
  2.5 Flare, Sunburst, GPT Image 2, FLUX.1 Kontext Pro, and FLUX.2 Pro.
  `GET /api/providers` returned these as available plus Auto. GPT Image 1.5
  currently advertises generation only and is omitted. No paid edit was sent.
  The previous `next build` attempt stalled during compilation and timed out.

## Remaining issues

1. **Live API contract:** verify that AvalAI accepts two `image[]` inputs and
   the target mask for each selected model. FLUX.2 Pro remains unverified and
   is excluded from Auto because current documentation lists only generation.
2. **Image quality:** test several real user/reference pairs, especially short
   hair to long hair, curls, hair over forehead, side views, glasses, and
   similar background/hair colors. Tune mask growth, reference alignment,
   feathering, and crop margins. Current composition keeps pixels outside the
   hair region, but does not score visual quality or identity similarity.
3. **Deployment:** Auto requires Python, MediaPipe, Pillow, NumPy, and the two
   model assets on the server. A Node-only deployment cannot run it. Current
   Python is spawned per request; a persistent Python worker would reduce
   startup time. SAM2 refinement is **not implemented** and should be added
   only for difficult masks after a benchmark shows a benefit.
4. **Cost operations:** review current account pricing before paid use. Exact
   charges are logged when AvalAI's transaction lookup is ready; retain
   request logs and reconcile pending costs. No hard per-request cap is enforced.
5. **Build and credentials:** diagnose the current build stall, and rotate the
   credentials previously embedded in tracked diagnostic scripts.

## Local setup and next commands

Follow the README's Python setup steps, set `AVALAI_API_KEY` in `.env.local`,
and run `npm run dev`. Test the model catalog with `GET /api/providers`. After
checking current account pricing, run exactly one explicit live test:

```text
node scripts/test-optimized-live.mjs <portrait.jpg> gpt-image-2.5-flare [reference.jpg]
```

This script can consume paid API credit. It saves the result under the ignored
`python_service/models/` directory. Keep real user photos and keys out of Git.
