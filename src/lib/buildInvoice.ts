import { convertLineItem, toTriple } from "./exchangeRates";
import { sum2 } from "./money";
import type {
  ConvertedInvoice,
  CurrencyConfidence,
  Rates,
  SupportedCurrency,
} from "./types";
import type { RawExtraction } from "./extractInvoice";

/**
 * Assemble the final response: convert every amount into all three currencies
 * and attach a human-readable note when the stated total is absent or doesn't
 * match the sum of line items. We always show the invoice's stated total
 * faithfully (F7) and never silently recompute it.
 */
export function buildConvertedInvoice(
  extraction: RawExtraction,
  currency: SupportedCurrency,
  confidence: CurrencyConfidence,
  rates: Rates,
): ConvertedInvoice {
  const lineItems = extraction.lineItems.map((item) => convertLineItem(item, rates));
  const total = extraction.total === null ? null : toTriple(extraction.total, rates);

  let notes: string | undefined;
  if (extraction.total === null && extraction.lineItems.length > 0) {
    notes = "This invoice does not state a total. Only the individual line items are shown.";
  } else if (extraction.total !== null && extraction.lineItems.length > 0) {
    const lineSum = sum2(extraction.lineItems.map((i) => i.amount));
    if (Math.abs(lineSum - extraction.total) > 0.01) {
      notes = `The line items add up to ${lineSum.toFixed(2)} ${currency}, but the invoice states a total of ${extraction.total.toFixed(2)} ${currency}. The invoice's stated total is shown.`;
    }
  }

  return {
    sourceCurrency: currency,
    currencyConfidence: confidence,
    rates,
    lineItems,
    total,
    ...(notes ? { notes } : {}),
  };
}
