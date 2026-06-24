import type { SupportedCurrency } from "./types";

/** Format a number as currency, e.g. 1234.5 -> "$1,234.50" / "€1,234.50". */
export function formatMoney(amount: number, currency: SupportedCurrency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
};

export function currencyLabel(currency: SupportedCurrency): string {
  return CURRENCY_LABELS[currency];
}
