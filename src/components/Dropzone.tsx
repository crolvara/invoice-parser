"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import type { ApiError } from "@/lib/types";

const MAX_FILE_MB = 10;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

interface DropzoneProps {
  onFile: (file: File) => void;
  /** Client-side rejection (wrong type / too large), shown inline as a banner. */
  onReject: (error: ApiError) => void;
  disabled?: boolean;
}

function validate(file: File): ApiError | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return { code: "NOT_PDF", message: "Only PDF files are supported. Please choose a .pdf invoice." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      code: "FILE_TOO_LARGE",
      message: `The file is too large. Please choose a PDF under ${MAX_FILE_MB} MB.`,
    };
  }
  return null;
}

export function Dropzone({ onFile, onReject, disabled }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      const error = validate(file);
      if (error) {
        onReject(error);
        return;
      }
      onFile(file);
    },
    [onFile, onReject],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={`dropzone${dragging ? " dropzone--active" : ""}${disabled ? " dropzone--disabled" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
      }}
      aria-label="Upload a PDF invoice"
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          // Reset so picking the SAME file again still fires onChange.
          e.currentTarget.value = "";
        }}
      />
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 16V4m0 0L8 8m4-4 4 4M5 20h14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="dropzone__title">
        {disabled ? "Reading invoice…" : "Drag & drop a PDF invoice"}
      </p>
      <p className="dropzone__hint">or click to choose a file · PDF only · up to {MAX_FILE_MB} MB</p>
    </div>
  );
}
