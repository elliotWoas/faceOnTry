"use client";

import React, { useState } from "react";
import { Cpu, CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";
import { ModelOption } from "@/lib/image-providers/types";

interface ModelSelectorProps {
  models: ModelOption[];
  selectedModelId: string;
  onModelSelect: (modelId: string) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onModelSelect,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedModel =
    models.find((m) => m.id === selectedModelId) || models[0];

  return (
    <div className="w-full max-w-xl mx-auto mb-6">
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 px-1">
        <span className="font-medium flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5 text-zinc-400" />
          AI Engine (Developer Model Selector)
        </span>
        {selectedModel && (
          <span className="text-[11px] text-zinc-400">
            {selectedModel.costEstimate}
          </span>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-left text-sm transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
              {selectedModel?.name || "Select AI Model"}
            </span>

            {selectedModel?.isConfigured ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                <CheckCircle2 className="w-3 h-3" />
                Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                <AlertTriangle className="w-3 h-3" />
                Not configured
              </span>
            )}
          </div>

          <ChevronDown
            className={`w-4 h-4 text-zinc-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-30 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {models.map((model) => {
                const isCurrent = model.id === selectedModelId;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      onModelSelect(model.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3.5 py-3 text-left flex items-start justify-between gap-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                      isCurrent
                        ? "bg-zinc-50/80 dark:bg-zinc-800/30"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {model.name}
                        </p>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wide">
                          {model.provider}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {model.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {model.isConfigured ? (
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Configured
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Not configured
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400">
                        {model.costEstimate}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {!selectedModel?.isConfigured && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 px-1">
          Missing API credentials for {selectedModel?.provider?.toUpperCase()}. Configure your key in <code className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">.env.local</code>.
        </p>
      )}
    </div>
  );
};
