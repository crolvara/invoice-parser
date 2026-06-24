import { describe, expect, it } from "vitest";
import { convertAmount, round2, sum2 } from "./money";

describe("round2 (HALF_UP)", () => {
  it("rounds half away from zero", () => {
    expect(round2("2.345")).toBe(2.35);
    expect(round2("2.344")).toBe(2.34);
    expect(round2("0.005")).toBe(0.01);
  });

  it("leaves values with <=2dp unchanged", () => {
    expect(round2(9.68)).toBe(9.68);
    expect(round2(-2.5)).toBe(-2.5);
  });
});

describe("convertAmount", () => {
  it("multiplies by the rate and rounds to 2dp", () => {
    expect(convertAmount(100, 1.0855)).toBe(108.55);
    expect(convertAmount(19572, 1.0712)).toBe(20965.53); // 19572 * 1.0712 = 20965.5264
  });

  it("returns the same value (to 2dp) at rate 1 — source currency", () => {
    expect(convertAmount(25, 1)).toBe(25);
    expect(convertAmount(0.02, 1)).toBe(0.02);
  });
});

describe("sum2", () => {
  it("sums without binary-float drift", () => {
    expect(sum2([0.1, 0.2])).toBe(0.3);
    expect(sum2([12, 46, 1, 220, 363])).toBe(642);
  });
});
