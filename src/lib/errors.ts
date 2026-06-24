import type { ApiErrorCode } from "./types";

/**
 * Base class for all expected, user-facing failures. Each carries a machine
 * code (for the UI to switch on) and an HTTP status. The API route catches
 * AppError and serializes it; anything else becomes a generic 500.
 */
export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** F4 — uploaded file is not a PDF. */
export class NotPdfError extends AppError {
  constructor() {
    super("NOT_PDF", "Only PDF files are supported. Please upload a .pdf invoice.", 415);
  }
}

/** F4 — file exceeds the configured size limit. */
export class FileTooLargeError extends AppError {
  constructor(maxMb: number) {
    super("FILE_TOO_LARGE", `The file is too large. Please upload a PDF under ${maxMb} MB.`, 413);
  }
}

export class NoFileError extends AppError {
  constructor() {
    super("NO_FILE", "No file was uploaded.", 400);
  }
}

/** F15 — the currency could not be identified; do not guess. */
export class CurrencyNotIdentifiedError extends AppError {
  constructor() {
    super(
      "CURRENCY_NOT_IDENTIFIED",
      "We couldn't identify the invoice's currency. The PDF doesn't state a currency anywhere, so we can't safely convert the amounts.",
      422,
    );
  }
}

/** F16 — currency identified but outside USD / EUR / GBP. */
export class UnsupportedCurrencyError extends AppError {
  constructor(detected: string) {
    super(
      "UNSUPPORTED_CURRENCY",
      `This invoice is in ${detected}. This tool only supports invoices in USD, EUR or GBP.`,
      422,
    );
  }
}

/** F17 — the model couldn't read the PDF or returned nothing usable. */
export class UnreadablePdfError extends AppError {
  constructor() {
    super(
      "UNREADABLE_PDF",
      "We couldn't read this PDF. It may be empty, corrupted, or not an invoice. Please try another file.",
      422,
    );
  }
}

/** F17 — the Anthropic API call failed (auth, network, rate limit, server error). */
export class AiServiceError extends AppError {
  constructor() {
    super(
      "AI_ERROR",
      "The AI service couldn't process the invoice right now. Please try again in a moment.",
      502,
    );
  }
}

/** F17 — the exchange-rate service was unreachable or returned an error. */
export class RateServiceError extends AppError {
  constructor() {
    super(
      "RATE_SERVICE",
      "We couldn't fetch live exchange rates right now. Please try again in a moment.",
      502,
    );
  }
}
