# AI Hairstyle Try-On & Style Advisor (MVP)

A simple, clean, production-ready web application for AI hairstyle editing built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

---

## Features

- **Mode 1 — Try a Hairstyle**:
  - Upload a selfie + a reference hairstyle image.
  - Applies the reference haircut while strictly preserving the person's identity, facial contours, skin tone, background, and lighting.
- **Mode 2 — Find My Best Hairstyle**:
  - Upload a selfie only.
  - Analyzes face shape, proportions, hairline, and hair texture to determine and generate the most flattering hairstyle.
  - Returns the recommended hairstyle name and rationale.
- **Developer Model Selector**:
  - Quick-switch between supported AI engines.
  - Displays instant configuration status (`Configured` vs `Not configured`).
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

The Auto model list comes from AvalAI `/v1/models` and includes only entries
that advertise `/v1/images/edits`. By default it prioritizes GPT Image 2.5
Sunburst, GPT Image 2.5 Flare, FLUX.2 Pro, GPT Image 2, then GPT Image 1.5.
Override with `AVALAI_EDIT_MODEL_PRIORITY`. Model availability and actual
per-request pricing must be checked against your account. An API failure may
try the next available model; this can incur charges for more than one request.

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
