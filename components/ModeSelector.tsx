"use client";

import React from "react";
import { Scissors, Sparkles } from "lucide-react";
import { HairEditMode } from "@/lib/image-providers/types";

interface ModeSelectorProps {
  currentMode: HairEditMode;
  onModeChange: (mode: HairEditMode) => void;
  disabled?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto mb-8">
      <div className="bg-zinc-100 dark:bg-zinc-900/80 p-1.5 rounded-2xl flex gap-2 border border-zinc-200 dark:border-zinc-800 shadow-inner">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onModeChange("try-hairstyle")}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            currentMode === "try-hairstyle"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/60 dark:border-zinc-700/50"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Scissors className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Try a hairstyle</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onModeChange("recommend-hairstyle")}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            currentMode === "recommend-hairstyle"
              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/60 dark:border-zinc-700/50"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span>Find my best hairstyle</span>
        </button>
      </div>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-3 font-normal">
        {currentMode === "try-hairstyle"
          ? "Upload your photo + a reference hairstyle. AI transfers the style while preserving your face & identity."
          : "Upload only your photo. AI analyzes your face shape and proportions to style the most flattering look."}
      </p>
    </div>
  );
};
