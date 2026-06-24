"use client";

import { currencyLabel, formatMoney } from "@/lib/format";
import { SUPPORTED_CURRENCIES, type ConvertedInvoice, type SupportedCurrency } from "@/lib/types";
import { RateBadge } from "./RateBadge";

export function ResultsTable({ invoice }: { invoice: ConvertedInvoice }) {
  const { sourceCurrency, currencyConfidence, lineItems, total, rates, notes } = invoice;

  const detectionNote =
    currencyConfidence === "symbol-only"
      ? "detected from a “$” symbol — assumed US Dollar"
      : "detected on the invoice";

  return (
    <section className="results" aria-label="Parsed invoice">
      <header className="results__head">
        <div>
          <h2>Parsed invoice</h2>
          <p className="results__currency">
            Source currency: <strong>{sourceCurrency}</strong> ({currencyLabel(sourceCurrency)}){" "}
            <span className="results__detected">— {detectionNote}</span>
          </p>
        </div>
        <RateBadge rates={rates} />
      </header>

      <div className="legend">
        <span className="pill pill--source">From invoice</span>
        <span className="pill pill--converted">Converted at live rates</span>
      </div>

      <div className="table-wrap">
        <table className="invoice-table">
          <thead>
            <tr>
              <th className="col-desc">Description</th>
              {SUPPORTED_CURRENCIES.map((cur) => (
                <CurrencyHeader key={cur} currency={cur} isSource={cur === sourceCurrency} />
              ))}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr key={i}>
                <td className="col-desc">{item.description || <em>(no description)</em>}</td>
                {SUPPORTED_CURRENCIES.map((cur) => (
                  <td
                    key={cur}
                    className={`col-money${cur === sourceCurrency ? " col-money--source" : ""}`}
                  >
                    {formatMoney(item.amounts[cur], cur)}
                  </td>
                ))}
              </tr>
            ))}
            {lineItems.length === 0 && (
              <tr>
                <td className="col-desc empty" colSpan={4}>
                  No line items were found on this invoice.
                </td>
              </tr>
            )}
          </tbody>
          {total && (
            <tfoot>
              <tr>
                <td className="col-desc">Total</td>
                {SUPPORTED_CURRENCIES.map((cur) => (
                  <td
                    key={cur}
                    className={`col-money col-money--total${cur === sourceCurrency ? " col-money--source" : ""}`}
                  >
                    {formatMoney(total[cur], cur)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {notes && <p className="results__note">ℹ️ {notes}</p>}
    </section>
  );
}

function CurrencyHeader({ currency, isSource }: { currency: SupportedCurrency; isSource: boolean }) {
  return (
    <th className={`col-money${isSource ? " col-money--source" : ""}`}>
      <span className="col-money__code">{currency}</span>
      <span className={`col-money__tag${isSource ? " col-money__tag--source" : ""}`}>
        {isSource ? "From invoice" : "Converted"}
      </span>
    </th>
  );
}
