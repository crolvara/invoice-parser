import { describe, expect, it } from "vitest";
import { CurrencyNotIdentifiedError, UnsupportedCurrencyError } from "./errors";
import { resolveCurrency, type RawExtraction } from "./extractInvoice";

const base: RawExtraction = {
  sourceCurrency: "EUR",
  currencyConfidence: "explicit",
  lineItems: [],
  total: null,
};

describe("resolveCurrency", () => {
  it("accepts an explicit supported currency", () => {
    expect(resolveCurrency({ ...base, sourceCurrency: "EUR" })).toEqual({
      currency: "EUR",
      confidence: "explicit",
    });
  });

  it("accepts a bare $ as USD with symbol-only confidence", () => {
    expect(
      resolveCurrency({ ...base, sourceCurrency: "USD", currencyConfidence: "symbol-only" }),
    ).toEqual({ currency: "USD", confidence: "symbol-only" });
  });

  it("F15: throws when no currency was identified (null)", () => {
    expect(() =>
      resolveCurrency({ ...base, sourceCurrency: null, currencyConfidence: "none" }),
    ).toThrow(CurrencyNotIdentifiedError);
  });

  it("F15: throws when confidence is none even if a code leaked through", () => {
    expect(() =>
      resolveCurrency({ ...base, sourceCurrency: "USD", currencyConfidence: "none" }),
    ).toThrow(CurrencyNotIdentifiedError);
  });

  it("F16: throws for an identified but unsupported currency (JPY)", () => {
    expect(() => resolveCurrency({ ...base, sourceCurrency: "JPY" })).toThrow(
      UnsupportedCurrencyError,
    );
  });

  it("normalizes casing/whitespace", () => {
    expect(resolveCurrency({ ...base, sourceCurrency: " gbp " }).currency).toBe("GBP");
  });
});
