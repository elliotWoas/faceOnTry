# Hair editing pipeline handoff — 2026-10-29

## Current state

The optimized AvalAI path is implemented in code but **is not ready to use for
paid production requests**. Python preprocessing and local composition work.
The AvalAI model catalog works. A live image edit has not succeeded yet.

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
   `/v1/images/edits`. Default priority: GPT Image 2.5 Sunburst, GPT Image 2.5
   Flare, FLUX.2 Pro, GPT Image 2, GPT Image 1.5. It sends the target as the
   first image, the reference as the second image, and the **target hair mask**
   as `mask`. It then calls Python `compose`. The priority is configurable
   through `AVALAI_EDIT_MODEL_PRIORITY`.
5. `app/api/providers/route.ts` exposes Auto and the live AvalAI edit models;
   `app/page.tsx` defaults to Auto when available and records the used model;
   `components/ResultPreview.tsx` displays that model. The generate route has
   the new pipeline branch, but see the routing bug below.
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

## Known issues to fix next

1. **Routing bug:** `app/api/generate/route.ts` recognizes `auto`, explicit
   `provider=avalai`, and `gpt-image-*`, but an explicit `flux.2-pro` request
   without `provider` falls into the legacy provider router. The manual test
   then reached Gemini and got HTTP 429. Fix the client to send the selected
   provider, and make the server resolve every selected model against its
   available-model list before dispatch. Re-run the live FLUX.2 test once.
2. **Budget policy:** the optimized AvalAI path does not use the legacy
   `$0.05` cost guardrail. Establish an explicit budget/quality policy using
   live AvalAI pricing and record actual request cost. Do this before paid
   production traffic or automatic retries. The existing edits in
   `lib/image-providers/index.ts` and `cost-guardrail.ts` predated this work
   and were intentionally left untouched.
3. **Live API contract:** verify that AvalAI accepts two `image[]` inputs and
   the target mask for each selected model. `flux.2-pro` advertises the edit
   endpoint in live metadata, while older public documentation describes it
   as generation-focused. Handle model-specific request differences.
4. **Image quality:** test several real user/reference pairs, especially short
   hair to long hair, curls, hair over forehead, side views, glasses, and
   similar background/hair colors. Tune mask growth, reference alignment,
   feathering, and crop margins. Current composition keeps pixels outside the
   hair region, but does not score visual quality or identity similarity.
5. **Deployment:** Auto requires Python, MediaPipe, Pillow, NumPy, and the two
   model assets on the server. A Node-only deployment cannot run it. Current
   Python is spawned per request; a persistent Python worker would reduce
   startup time. SAM2 refinement is **not implemented** and should be added
   only for difficult masks after a benchmark shows a benefit.

## Local setup and next commands

Follow the README's Python setup steps, set `AVALAI_API_KEY` in `.env.local`,
and run `npm run dev`. Test the model catalog with `GET /api/providers`. After
fixing routing and the budget policy, run exactly one explicit live test:

```text
node scripts/test-optimized-live.mjs <portrait.jpg> flux.2-pro [reference.jpg]
```

This script can consume paid API credit. It saves the result under the ignored
`python_service/models/` directory. Keep real user photos and keys out of Git.
