# AI Hairstyle Try-On & Style Advisor (MVP)

> Implementation status and exact next steps: [HANDOFF.md](HANDOFF.md).

A prototype web application for AI hairstyle editing built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**. The optimized AvalAI path still needs a successful live edit and visual quality checks before production use.

---

## Features

V1 prioritizes **Try a Hairstyle**: upload one clear photo of yourself and one
reference photo showing the hairstyle. The reference should show one visible
face and the full hair shape; a similar camera angle gives the alignment step
more useful information. You can replace the reference and try another style
without re-uploading your own photo. The one-photo recommendation mode remains
available as a secondary workflow.

- **Mode 1 — Try a Hairstyle**:
  - Upload a selfie + a reference hairstyle image.
  - Applies the reference haircut while aiming to preserve the person's identity, facial contours, skin tone, background, and lighting.
- **Mode 2 — Find My Best Hairstyle**:
  - Upload a selfie only.
  - Analyzes face shape, proportions, hairline, and hair texture to determine and generate the most flattering hairstyle.
  - Returns the recommended hairstyle name and rationale.
- **Developer Model Selector**:
  - Quick-switch between supported AI engines.
  - Displays provider configuration and live AvalAI catalog availability.
- **Aspect-Ratio Preserved Image Handling**:
  - Client & server-side validation (JPG, JPEG, PNG, WEBP, max 10MB).
  - Clean side-by-side or focused result view with 1-click download.

---

## Supported AI Providers & Models

| Model | Provider | Type / Cost |
| :--- | :--- | :--- |
| **Gemini 3.1 Flash Image** | Google AI Studio | Free tier / ~$0.067/img |
| **Gemini 2.5 Flash Image** | Google AI Studio | Free tier / ~$0.039/img |
| **FLUX Kontext Pro** | Replicate | ~$0.04/img |
| **Qwen Image Edit Plus** | Replicate | ~$0.03/img |
| **SeedEdit 3.0** | Replicate | ~$0.03/img |
| **9Router** | OpenAI-compatible HTTP adapter | Configurable |
| **AvalAI.ir** | OpenAI-compatible HTTP adapter | Configurable |

---

## Quick Start

### 1. Configure Environment Variables

Create `.env.local` in the project root. Never put API keys in client code:

```bash
cp .env.example .env.local
```

Fill in at least one provider API key:

```env
# Google Gemini (recommended for free tier testing)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image

# Replicate
REPLICATE_API_TOKEN=your_replicate_token_here

# 9Router (OpenAI-compatible)
NINE_ROUTER_API_KEY=
NINE_ROUTER_BASE_URL=https://api.9router.com/v1
NINE_ROUTER_IMAGE_MODEL=

# AvalAI (OpenAI-compatible)
AVALAI_API_KEY=
AVALAI_BASE_URL=https://api.avalai.ir/v1
AVALAI_IMAGE_MODEL=
```

### 2. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Optimized AvalAI hair editing

The **Auto (AvalAI image edit)** option uses the Python processor before and
after the AvalAI call. Python detects one face and the hair, crops the target
to a 1024 px square canvas and the reference to at most 768 px, and creates
a transparent edit mask from the target hair. After editing, it composites
only the expanded hair region over the original full-resolution photo. The
reference photo is sent as a second image, never as the target mask.

Install Python 3.10+ and the preprocessing dependencies, then download the two
official MediaPipe model files once:

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\python -m pip install -r python_service\requirements.txt
.venv\Scripts\python python_service\download_models.py
```

macOS/Linux:

```bash
.venv/bin/python -m pip install -r python_service/requirements.txt
.venv/bin/python python_service/download_models.py
```

Set `PYTHON_BIN` in `.env.local` if Python is not in `.venv`. The model files
live in `python_service/models/` and are ignored by Git. On serverless hosting,
ship the Python runtime and model assets separately or run this processor in a
persistent service; a stock Node-only Next.js deployment cannot run Auto mode.

The model selector loads **all models that your AvalAI account advertises for
`/v1/images/edits`** from `/v1/models`. GPT Image and FLUX edit models are
sorted near the top; `AVALAI_EDIT_MODEL_PRIORITY` changes that order. A
catalog entry is marked available without entering manual cost estimates.
Auto selects the first available documented GPT edit model. FLUX models can be
selected explicitly when the live catalog advertises edits. FLUX.2 Pro is labeled
unverified because [AvalAI's FLUX.2 Pro guide documents generation rather than
edits](https://docs.avalai.ir/en/providers/bfl).

Selecting an AvalAI model can incur a charge. GPT Image 2.5 uses
`quality=medium`; [AvalAI documents variable input and output
costs](https://docs.avalai.ir/en/api-reference/images). The old
`AVALAI_EDIT_MAX_COST_USD` and `AVALAI_EDIT_ESTIMATED_COSTS_USD` settings are no
longer used because a fixed preflight estimate cannot cap token-based image
edits. Auto makes **one** paid edit request, with no automatic fallback. Each
successful call logs the provider request ID and
attempts to look up exact USD cost through [AvalAI's User API](https://docs.avalai.ir/en/api-reference/user).
If the transaction has not posted yet, the log retains the request ID for
later reconciliation. Keep server logs for cost auditing.

---

## Architecture & File Structure

```
├── app/
│   ├── api/
│   │   ├── generate/route.ts      # Server-side hair edit generation & validation
│   │   └── providers/route.ts     # Developer provider status check
│   ├── globals.css                # Tailwind CSS styling
│   ├── layout.tsx                 # Root layout & SEO metadata
│   └── page.tsx                   # Main single-page interface
├── components/
│   ├── ImageUploader.tsx          # Drag-and-drop uploader with validation & preview
│   ├── ModeSelector.tsx           # Switch between Mode 1 and Mode 2
│   ├── ModelSelector.tsx          # Developer model switcher with live status
│   └── ResultPreview.tsx          # Side-by-side comparison, download & retry
├── lib/
│   └── image-providers/
│       ├── gemini.ts              # Google Gemini image provider
│       ├── replicate.ts           # Replicate API provider with polling
│       ├── generic.ts             # 9Router & AvalAI HTTP adapter
│       ├── prompts.ts             # Mode 1 & Mode 2 prompts
│       ├── types.ts               # Core TypeScript definitions
│       └── index.ts               # Central router & provider dispatcher
```
