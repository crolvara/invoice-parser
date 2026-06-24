import { describe, expect, it } from "vitest";
import { buildConvertedInvoice } from "./buildInvoice";
import type { RawExtraction } from "./extractInvoice";
import type { Rates } from "./types";

const rates: Rates = { base: "USD", date: "2026-06-24", USD: 1, EUR: 0.92, GBP: 0.78 };

describe("buildConvertedInvoice", () => {
  it("converts line items and total into all three currencies", () => {
    const extraction: RawExtraction = {
      sourceCurrency: "USD",
      currencyConfidence: "explicit",
      lineItems: [{ description: "Pro Plan", amount: 25 }],
      total: 25,
    };

    const result = buildConvertedInvoice(extraction, "USD", "explicit", rates);

    expect(result.lineItems[0]!.amounts).toEqual({ USD: 25, EUR: 23, GBP: 19.5 });
    expect(result.total).toEqual({ USD: 25, EUR: 23, GBP: 19.5 });
    expect(result.notes).toBeUndefined();
  });

  it("notes when the invoice states no total", () => {
    const extraction: RawExtraction = {
      sourceCurrency: "USD",
      currencyConfidence: "symbol-only",
      lineItems: [{ description: "Item 1", amount: 12 }],
      total: null,
    };

    const result = buildConvertedInvoice(extraction, "USD", "symbol-only", rates);
    expect(result.total).toBeNull();
    expect(result.notes).toMatch(/does not state a total/i);
  });

  it("notes when line items don't add up to the stated total", () => {
    const extraction: RawExtraction = {
      sourceCurrency: "USD",
      currencyConfidence: "explicit",
      lineItems: [
        { description: "A", amount: 100 },
        { description: "B", amount: 200 },
      ],
      total: 250,
    };

    const result = buildConvertedInvoice(extraction, "USD", "explicit", rates);
    expect(result.notes).toMatch(/add up to 300\.00.*total of 250\.00/i);
  });
});
