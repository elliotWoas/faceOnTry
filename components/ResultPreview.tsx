"use client";

import React, { useState } from "react";
import {
  Download,
  RotateCcw,
  Sparkles,
  ArrowRightLeft,
  Check,
  ExternalLink,
} from "lucide-react";

interface ResultPreviewProps {
  originalImageUrl: string;
  resultImageUrl: string;
  referenceImageUrl?: string | null;
  hairstyleName?: string;
  explanation?: string;
  onReset: () => void;
}

export const ResultPreview: React.FC<ResultPreviewProps> = ({
  originalImageUrl,
  resultImageUrl,
  referenceImageUrl,
  hairstyleName,
  explanation,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"side-by-side" | "single">("side-by-side");

  const handleDownload = async () => {
    try {
      if (resultImageUrl.startsWith("data:")) {
        // Direct download for base64 data URIs
        const link = document.createElement("a");
        link.href = resultImageUrl;
        link.download = `hairstyle-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // External URL download
        const res = await fetch(resultImageUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `hairstyle-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: open in new tab
      window.open(resultImageUrl, "_blank");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center animate-in fade-in duration-300">
      {/* Header with Mode 2 recommendation info if present */}
      {hairstyleName && (
        <div className="w-full bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-400/15 dark:via-amber-400/5 border border-amber-500/20 rounded-2xl p-5 mb-8 text-left">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            AI Hairstyle Recommendation
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
            {hairstyleName}
          </h3>
          {explanation && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2 leading-relaxed">
              {explanation}
            </p>
          )}
        </div>
      )}

      {/* Comparison Layout Controls */}
      <div className="w-full flex items-center justify-between mb-4 px-1">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Transformation Preview
        </span>

        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700/50">
          <button
            type="button"
            onClick={() => setViewMode("side-by-side")}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
              viewMode === "side-by-side"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Side by Side
          </button>
          <button
            type="button"
            onClick={() => setViewMode("single")}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
              viewMode === "single"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Result Only
          </button>
        </div>
      </div>

      {/* Images Display */}
      {viewMode === "side-by-side" ? (
        <div
          className={`w-full grid gap-4 ${
            referenceImageUrl ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"
          }`}
        >
          {/* Original user photo */}
          <div className="flex flex-col items-center bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
              Original Photo
            </span>
            <div className="w-full h-[340px] flex items-center justify-center overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={originalImageUrl}
                alt="Original selfie"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
          </div>

          {/* Reference photo (if Mode 1) */}
          {referenceImageUrl && (
            <div className="flex flex-col items-center bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                Reference Style
              </span>
              <div className="w-full h-[340px] flex items-center justify-center overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referenceImageUrl}
                  alt="Reference hairstyle"
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Generated Result */}
          <div className="flex flex-col items-center bg-zinc-50 dark:bg-zinc-900/60 border-2 border-emerald-500/40 dark:border-emerald-500/30 rounded-2xl p-3 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              New Hairstyle
            </span>
            <div className="w-full h-[340px] flex items-center justify-center overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultImageUrl}
                alt="Edited hairstyle"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Single result large display */
        <div className="w-full max-w-lg flex flex-col items-center bg-zinc-50 dark:bg-zinc-900/60 border-2 border-emerald-500/40 rounded-2xl p-3">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Generated Hairstyle
          </span>
          <div className="w-full h-[440px] flex items-center justify-center overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultImageUrl}
              alt="Edited hairstyle"
              className="max-h-full max-w-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mt-8">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download Hairstyle
        </button>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
};
