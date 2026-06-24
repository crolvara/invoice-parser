"use client";

import type { Rates } from "@/lib/types";

/** F14 — communicate that rates are live/current, with the effective date. */
export function RateBadge({ rates }: { rates: Rates }) {
  const formatted = new Date(rates.date + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <div className="rate-badge" title="Conversions use European Central Bank reference rates via the Frankfurter API.">
      <span className="rate-badge__dot" aria-hidden="true" />
      Live rates · ECB via Frankfurter · as of {formatted}
    </div>
  );
}
