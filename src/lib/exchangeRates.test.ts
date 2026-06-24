import { afterEach, describe, expect, it, vi } from "vitest";
import { RateServiceError } from "./errors";
import { getRates } from "./exchangeRates";

function mockFetch(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  } as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getRates", () => {
  it("adds base->base = 1 (Frankfurter omits the base)", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ base: "EUR", date: "2026-06-24", rates: { USD: 1.0855, GBP: 0.8512 } }),
    );

    const rates = await getRates("EUR");
    expect(rates).toEqual({
      base: "EUR",
      date: "2026-06-24",
      EUR: 1,
      USD: 1.0855,
      GBP: 0.8512,
    });
  });

  it("throws RateServiceError on a non-200 response", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false));
    await expect(getRates("USD")).rejects.toThrow(RateServiceError);
  });

  it("throws RateServiceError when a rate is missing", async () => {
    vi.stubGlobal("fetch", mockFetch({ base: "GBP", date: "2026-06-24", rates: { USD: 1.27 } }));
    await expect(getRates("GBP")).rejects.toThrow(RateServiceError);
  });
});
