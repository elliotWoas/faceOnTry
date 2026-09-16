"use client";

import React, { useRef, useState, useCallback } from "react";
import { UploadCloud, X, Image as ImageIcon, AlertCircle } from "lucide-react";

interface ImageUploaderProps {
  id: string;
  label: string;
  sublabel: string;
  file: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File | null, previewUrl: string | null) => void;
  disabled?: boolean;
  required?: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  id,
  label,
  sublabel,
  file,
  previewUrl,
  onFileSelect,
  disabled = false,
  required = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const processFile = useCallback(
    (selectedFile: File) => {
      setValidationError(null);

      // Validate type
      if (!ALLOWED_TYPES.includes(selectedFile.type.toLowerCase())) {
        setValidationError("Only JPG, JPEG, PNG, or WEBP images are supported.");
        return;
      }

      // Validate size
      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setValidationError("Image exceeds 10MB limit. Please upload a smaller file.");
        return;
      }

      const url = URL.createObjectURL(selectedFile);
      onFileSelect(selectedFile, url);
    },
    [onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setValidationError(null);
    onFileSelect(null, null);
  };

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor={id}
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5"
        >
          {label}
          {required && <span className="text-rose-500 text-xs">*</span>}
        </label>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Max 10MB</span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && !disabled && fileInputRef.current?.click()}
        className={`relative group rounded-2xl border-2 transition-all duration-200 overflow-hidden flex flex-col items-center justify-center min-h-[260px] cursor-pointer ${
          isDragging
            ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/60"
            : file
            ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50"
            : "border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/30 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
        } ${disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />

        {previewUrl ? (
          <div className="relative w-full h-full flex flex-col items-center p-3">
            <div className="relative max-h-[280px] w-full flex items-center justify-center overflow-hidden rounded-xl bg-zinc-950/5 dark:bg-black/20">
              {/* Image preview preserving natural aspect ratio */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={label}
                className="max-h-[260px] w-auto max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>

            <div className="w-full flex items-center justify-between mt-3 px-1 text-xs text-zinc-500">
              <span className="truncate max-w-[200px]">
                {file ? file.name : "Selected image"}
              </span>
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline font-medium cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3 text-zinc-500 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
            </div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Click to upload or drag & drop
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[240px]">
              {sublabel}
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 uppercase tracking-wider font-semibold">
              JPG, PNG, WEBP
            </p>
          </div>
        )}
      </div>

      {validationError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 mt-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};
