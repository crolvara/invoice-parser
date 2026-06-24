import { RateServiceError } from "./errors";
import { convertAmount } from "./money";
import type { ConvertedLineItem, MoneyTriple, Rates, SupportedCurrency } from "./types";

// Frankfurter: free, no API key, ECB reference rates. (F13 — real, public source.)
const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest";

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Fetch live rates with the given source currency as the base.
 * Frankfurter omits the base from its `rates` object, so we add base -> base = 1
 * ourselves. (F12 — live rates, not hard-coded multipliers.)
 */
export async function getRates(base: SupportedCurrency): Promise<Rates> {
  const url = `${FRANKFURTER_URL}?base=${base}&symbols=USD,EUR,GBP`;

  let res: Response;
  try {
    res = await fetch(url, {
      // Frankfurter updates rates once a day; let Next cache for an hour.
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new RateServiceError();
  }

  if (!res.ok) throw new RateServiceError();

  let data: FrankfurterResponse;
  try {
    data = (await res.json()) as FrankfurterResponse;
  } catch {
    throw new RateServiceError();
  }

  const rates = { ...data.rates, [base]: 1 };
  if (
    typeof rates.USD !== "number" ||
    typeof rates.EUR !== "number" ||
    typeof rates.GBP !== "number" ||
    !data.date
  ) {
    throw new RateServiceError();
  }

  return { base, date: data.date, USD: rates.USD, EUR: rates.EUR, GBP: rates.GBP };
}

/** Convert a single source-currency amount into all three target currencies. */
export function toTriple(amount: number, rates: Rates): MoneyTriple {
  return {
    USD: convertAmount(amount, rates.USD),
    EUR: convertAmount(amount, rates.EUR),
    GBP: convertAmount(amount, rates.GBP),
  };
}

export function convertLineItem(
  item: { description: string; amount: number },
  rates: Rates,
): ConvertedLineItem {
  return { description: item.description, amounts: toTriple(item.amount, rates) };
}
