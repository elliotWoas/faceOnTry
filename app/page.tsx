"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Scissors, Loader2, AlertCircle } from "lucide-react";
import { ModeSelector } from "@/components/ModeSelector";
import { ImageUploader } from "@/components/ImageUploader";
import { ModelSelector } from "@/components/ModelSelector";
import { ResultPreview } from "@/components/ResultPreview";
import { HairEditMode, ModelOption } from "@/lib/image-providers/types";

export default function Home() {
  const [mode, setMode] = useState<HairEditMode>("try-hairstyle");
  const [userFile, setUserFile] = useState<File | null>(null);
  const [userPreview, setUserPreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);

  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [hairstyleName, setHairstyleName] = useState<string | undefined>();
  const [explanation, setExplanation] = useState<string | undefined>();

  // Fetch supported models and their configuration status
  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetch("/api/providers");
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models)) {
            setModels(data.models);
            // Default to verified active model (qwen-image-edit-plus) or first configured
            const preferred = data.models.find(
              (m: ModelOption) => m.id === "qwen-image-edit-plus" && m.isConfigured
            );
            const firstConfigured =
              preferred || data.models.find((m: ModelOption) => m.isConfigured);
            setSelectedModelId(
              firstConfigured ? firstConfigured.id : data.models[0]?.id || ""
            );
          }
        }
      } catch (e) {
        console.error("Failed to load models:", e);
      }
    }
    loadModels();
  }, []);

  // Handle form submission
  const handleGenerate = async () => {
    setError(null);

    // Client-side validations
    if (!userFile) {
      setError("Please upload a photo of yourself first.");
      return;
    }

    if (mode === "try-hairstyle" && !referenceFile) {
      setError("Please upload a reference hairstyle image.");
      return;
    }

    setIsLoading(true);
    setLoadingStep(
      mode === "try-hairstyle"
        ? "Analyzing facial contours and reference haircut..."
        : "Analyzing face shape, proportions, and hair structure..."
    );

    // Progress step updates
    const timer1 = setTimeout(() => {
      setLoadingStep(
        mode === "try-hairstyle"
          ? "Aligning hair shape and texture to your head..."
          : "Selecting optimal hairstyle and adapting to your features..."
      );
    }, 4000);

    const timer2 = setTimeout(() => {
      setLoadingStep("Preserving identity and generating photorealistic edit...");
    }, 9000);

    try {
      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("userImage", userFile);

      if (mode === "try-hairstyle" && referenceFile) {
        formData.append("referenceImage", referenceFile);
      }

      if (selectedModelId) {
        formData.append("model", selectedModelId);
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed. Please try again.");
      }

      setResultImage(data.imageUrl);
      setHairstyleName(data.hairstyleName);
      setExplanation(data.explanation);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to generate hairstyle.";
      setError(msg);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleReset = () => {
    setResultImage(null);
    setHairstyleName(undefined);
    setExplanation(undefined);
    setError(null);
  };

  const isFormValid =
    mode === "try-hairstyle"
      ? Boolean(userFile && referenceFile)
      : Boolean(userFile);

  return (
    <main className="flex-1 flex flex-col items-center justify-between py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      <div className="w-full">
        {/* App Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-200/60 dark:bg-zinc-800/60 text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-3 border border-zinc-300/40 dark:border-zinc-700/50">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Hair Studio MVP</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Realistic Hairstyle Editor
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
            Try any haircut with photorealistic accuracy while preserving 100% of
            your face and identity.
          </p>
        </header>

        {/* Developer Model Selector */}
        {models.length > 0 && (
          <ModelSelector
            models={models}
            selectedModelId={selectedModelId}
            onModelSelect={setSelectedModelId}
            disabled={isLoading}
          />
        )}

        {/* Main Content Area */}
        {!resultImage ? (
          <div className="w-full">
            {/* Mode Switcher */}
            <ModeSelector
              currentMode={mode}
              onModeChange={(newMode) => {
                setMode(newMode);
                setError(null);
              }}
              disabled={isLoading}
            />

            {/* Error Banner */}
            {error && (
              <div className="w-full max-w-xl mx-auto mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-800 dark:text-rose-300 animate-in fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Error</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div
              className={`w-full max-w-2xl mx-auto grid gap-6 ${
                mode === "try-hairstyle" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-md"
              }`}
            >
              {/* User photo upload */}
              <ImageUploader
                id="user-selfie"
                label="1. Your Photo (Selfie)"
                sublabel="Clear front-facing photo with visible hairline"
                file={userFile}
                previewUrl={userPreview}
                onFileSelect={(f, url) => {
                  setUserFile(f);
                  setUserPreview(url);
                }}
                disabled={isLoading}
                required
              />

              {/* Reference hairstyle upload (Mode 1 only) */}
              {mode === "try-hairstyle" && (
                <ImageUploader
                  id="hair-reference"
                  label="2. Hairstyle Reference"
                  sublabel="Photo of the haircut or hairstyle you want to try"
                  file={referenceFile}
                  previewUrl={referencePreview}
                  onFileSelect={(f, url) => {
                    setReferenceFile(f);
                    setReferencePreview(url);
                  }}
                  disabled={isLoading}
                  required
                />
              )}
            </div>

            {/* Generate Action Button */}
            <div className="w-full max-w-md mx-auto mt-8 flex flex-col items-center">
              <button
                type="button"
                disabled={!isFormValid || isLoading}
                onClick={handleGenerate}
                className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer ${
                  !isFormValid || isLoading
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed shadow-none"
                    : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 hover:shadow-lg active:scale-[0.99]"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : mode === "try-hairstyle" ? (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>Apply Reference Hairstyle</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Find My Best Hairstyle</span>
                  </>
                )}
              </button>

              {/* Loading progress message */}
              {isLoading && (
                <div className="mt-4 flex flex-col items-center text-center animate-pulse">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {loadingStep}
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-1">
                    Takes approx. 10–30 seconds
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Result View */
          <ResultPreview
            originalImageUrl={userPreview || ""}
            resultImageUrl={resultImage}
            referenceImageUrl={
              mode === "try-hairstyle" ? referencePreview : null
            }
            hairstyleName={hairstyleName}
            explanation={explanation}
            onReset={handleReset}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-zinc-400 dark:text-zinc-600 mt-16 pt-6 border-t border-zinc-200/60 dark:border-zinc-800/60">
        AI Hairstyle Editor MVP • Identity & Face Preservation First
      </footer>
    </main>
  );
}
