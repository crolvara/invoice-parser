"use client";

import type { ApiError } from "@/lib/types";

const TITLES: Partial<Record<ApiError["code"], string>> = {
  CURRENCY_NOT_IDENTIFIED: "Currency not found",
  UNSUPPORTED_CURRENCY: "Unsupported currency",
  UNREADABLE_PDF: "Couldn't read the PDF",
  RATE_SERVICE: "Exchange rates unavailable",
  AI_ERROR: "AI service unavailable",
  NOT_PDF: "Not a PDF",
  FILE_TOO_LARGE: "File too large",
};

export function ErrorBanner({ error, onDismiss }: { error: ApiError; onDismiss?: () => void }) {
  return (
    <div className="banner banner--error" role="alert">
      <div>
        <strong>{TITLES[error.code] ?? "Something went wrong"}</strong>
        <p>{error.message}</p>
      </div>
      {onDismiss && (
        <button className="banner__close" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
