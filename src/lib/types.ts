// Shared types used by both the API route (server) and the React UI (client).

/** The three currencies this tool can display. */
export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(code: string): code is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

/**
 * How confident we are about the detected currency.
 * - "explicit"    — an ISO code or unambiguous symbol (€, £, EUR, GBP) was present.
 * - "symbol-only" — only a bare "$" was present; we assume USD (documented assumption).
 */
export type CurrencyConfidence = "explicit" | "symbol-only";

/** One amount expressed in all three target currencies. */
export interface MoneyTriple {
  USD: number;
  EUR: number;
  GBP: number;
}

/** Live exchange rates: how many of each target currency equals 1 unit of `base`. */
export interface Rates extends MoneyTriple {
  /** ISO date the rates are effective for (from Frankfurter / ECB). */
  date: string;
  /** The source currency the rates are based on. */
  base: SupportedCurrency;
}

export interface ConvertedLineItem {
  description: string;
  /** The line amount in all three currencies (source kept faithful to the PDF). */
  amounts: MoneyTriple;
}

/** The successful response from POST /api/parse. */
export interface ConvertedInvoice {
  sourceCurrency: SupportedCurrency;
  currencyConfidence: CurrencyConfidence;
  rates: Rates;
  lineItems: ConvertedLineItem[];
  /** The invoice's stated total in all three currencies, or null if none stated. */
  total: MoneyTriple | null;
  /** Optional human-readable note (e.g. total vs. line-item-sum mismatch). */
  notes?: string;
}

/** Machine-readable error codes the UI switches on. */
export type ApiErrorCode =
  | "NO_FILE"
  | "NOT_PDF"
  | "FILE_TOO_LARGE"
  | "CURRENCY_NOT_IDENTIFIED"
  | "UNSUPPORTED_CURRENCY"
  | "UNREADABLE_PDF"
  | "RATE_SERVICE"
  | "AI_ERROR"
  | "INTERNAL";

/** The error response shape from POST /api/parse (non-2xx). */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
}
