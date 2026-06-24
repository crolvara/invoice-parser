import Decimal from "decimal.js";

// Bulgarian/EU accounting convention: round half away from zero (HALF_UP).
// All monetary arithmetic goes through Decimal — never raw JS float math.
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

/** Round a value to 2 decimal places (HALF_UP) and return a plain number. */
export function round2(value: Decimal.Value): number {
  const n = new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  // Normalize negative zero (e.g. a sub-cent discount that rounds to 0 in a
  // weaker currency) so it never displays as "-$0.00".
  return n === 0 ? 0 : n;
}

/**
 * Convert an amount in the source currency to a target currency.
 * `rate` is how many units of the target equal 1 unit of the source.
 * A rate of 1 (source -> source) returns the amount unchanged to 2dp.
 */
export function convertAmount(amount: number, rate: number): number {
  return round2(new Decimal(amount).times(rate));
}

/** Sum a list of amounts with Decimal precision, returning a 2dp number. */
export function sum2(amounts: number[]): number {
  return round2(amounts.reduce((acc, a) => acc.plus(a), new Decimal(0)));
}
