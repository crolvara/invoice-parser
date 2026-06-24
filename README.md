# Invoice Parser

Upload a PDF invoice and see every monetary value in **USD, EUR and GBP**. The
invoice's source currency is read directly from the PDF by Claude and kept
faithful to the document; the other two currencies are filled in using **live
ECB exchange rates** (via the Frankfurter API).

---

## Prerequisites

- **Node.js 20.9+** (developed on Node 24) and **npm**.
- An **Anthropic API key** (the temporary key provided with the assignment).

## Install & run

```bash
npm install

# add your key — this file is gitignored and never reaches the browser
cp .env.local.example .env.local
#   then edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...

npm run dev
```

Open **http://localhost:3000**, drag a PDF onto the dropzone (or click to pick
one), and the parsed invoice appears below in all three currencies.

### Other scripts

```bash
npm test     # unit tests (Vitest)
npm run build && npm start   # production build + serve
```

---

## How it works (architecture)

A single **Next.js (App Router)** application — no separate backend process.
The UI is a client component; all secret-bearing work happens server-side in one
**Route Handler**, so the Anthropic key is read only on the server and is never
bundled into the browser.

```
Browser (React 19 client)                 Server (Route Handler, Node runtime)
─────────────────────────                 ────────────────────────────────────
Dropzone ──FormData(PDF)──▶  POST /api/parse
                                  │ 1. validate (PDF? size? magic bytes)   ── F1–F4
                                  │ 2. extractInvoice(pdf)  → Claude        ── F5
                                  │ 3. resolveCurrency()    → gate USD/EUR/GBP ── F11,F15,F16
                                  │ 4. getRates(source)     → Frankfurter   ── F12–F14
                                  │ 5. buildConvertedInvoice() → convert    ── F6–F8
ResultsTable ◀──ConvertedInvoice (JSON)──┘
```

### Separation of concerns

| File | Responsibility |
|---|---|
| `src/app/api/parse/route.ts` | Thin orchestrator: upload validation → extract → gate → rates → convert. |
| `src/lib/extractInvoice.ts` | The Claude call + the Zod output schema, plus the pure `resolveCurrency` currency gate. |
| `src/lib/exchangeRates.ts` | Frankfurter fetch + per-amount conversion. |
| `src/lib/buildInvoice.ts` | Assembles the response; adds the total/line-item-mismatch note. |
| `src/lib/money.ts` | All monetary arithmetic — `Decimal.js`, HALF_UP rounding. |
| `src/lib/errors.ts` | Typed `AppError`s carrying an HTTP status + machine code. |
| `src/lib/types.ts` | Shared types used by both client and server. |
| `src/components/*`, `src/hooks/*` | UI + the TanStack Query mutation. |

The data-shaping helpers (`resolveCurrency`, `getRates`, `buildConvertedInvoice`,
`money`) are pure and unit-tested without touching the network or the SDK.

---

## AI setup

- **Model:** `claude-sonnet-4-6` — a strong accuracy/speed balance that handles
  the European number format and multi-page, discount-heavy invoices in the
  samples while keeping the loading state short.
- **PDF input:** the raw PDF is sent as a base64 `document` content block (no
  OCR/text-extraction step in our code — Claude reads the PDF directly).
- **Structured output:** we use `client.messages.parse(...)` with
  `output_config.format = zodOutputFormat(schema)` so the model returns data
  that already validates against our Zod schema (`@anthropic-ai/sdk/helpers/zod`).
- **Key design choice — the model normalizes, the app validates & converts.**
  Claude is instructed to return all amounts as plain decimals (`"19.572,00"` →
  `19572.00`) and the currency as an ISO-4217 code. This deliberately offloads
  brittle locale/number-format parsing to the model. The application stays
  responsible for the things code should own: validating the currency is
  supported, fetching live rates, and doing exact Decimal money math.
- **Built with:** Claude Code (Opus). The currency-gate logic, rounding, and
  rate conversion were unit-tested and verified directly; the model's extraction
  quality was checked by hand against the four sample invoices.

---

## Currency logic

- **Source currency is faithful to the PDF** — its column shows the amounts
  exactly as the model read them; only the other two columns are converted.
- **Live rates, not hard-coded multipliers** — `GET https://api.frankfurter.dev/v1/latest?base={SRC}&symbols=USD,EUR,GBP`
  (ECB reference rates, no API key). Frankfurter omits the base from its
  response, so we add `base → base = 1` ourselves. The effective rate **date** is
  shown in the UI badge ("Live rates · ECB via Frankfurter · as of …").
- **Money math** uses `Decimal.js` with **HALF_UP** rounding to 2 decimals —
  never raw JavaScript float arithmetic.

---

## Error handling

Every failure returns a JSON `{ code, message }` and the UI renders a clear
banner. No silent guessing.

| Situation | Code | HTTP |
|---|---|---|
| Currency not identifiable on the PDF (**F15**) | `CURRENCY_NOT_IDENTIFIED` | 422 |
| Currency identified but not USD/EUR/GBP, e.g. JPY (**F16**) | `UNSUPPORTED_CURRENCY` | 422 |
| Unreadable / non-invoice PDF (**F17**) | `UNREADABLE_PDF` | 422 |
| Anthropic API failure — auth/network/rate limit (**F17**) | `AI_ERROR` | 502 |
| Exchange-rate service down (**F17**) | `RATE_SERVICE` | 502 |
| Non-PDF or oversized upload (**F4**) | `NOT_PDF` / `FILE_TOO_LARGE` | 415 / 413 |

PDF type is checked twice — the declared MIME/extension **and** the `%PDF-`
magic bytes on the uploaded buffer.

---

## Behaviour against the sample invoices

| Sample | Result |
|---|---|
| `sample-invoice-01` | Only a `$` symbol → detected **USD** with a "from $ symbol" note (documented assumption). Its near-zero placeholder total vs. the line-item sum is surfaced as a soft note, not silently corrected. |
| `sample-invoice-02` | **USD**, 2 pages, nested discount lines shown as negative amounts, net total \$25.00. |
| `sample-invoice-03` | **EUR**; `19.572,00` is correctly read as `19572.00`; the GB VAT number does **not** mislead the currency detection. |
| `sample-invoice-04` | No currency anywhere → **`CURRENCY_NOT_IDENTIFIED`** error (no guess). |

---

## Known limitations & assumptions

- **Three currencies only** — USD, EUR, GBP (by design). Any other identified
  currency is a clear, explained error.
- **Bare `$` is assumed to be USD.** A lone `$` is technically ambiguous
  (USD/CAD/AUD/…); we assume USD (the most common) and label it as
  symbol-derived in the UI.
- **The total is shown as stated on the invoice.** When line items don't add up
  to it (or no total is stated), a non-blocking note explains the discrepancy —
  we never overwrite the document's figure.
- One invoice at a time; no persistence, accounts, or batch upload (all out of
  scope per the brief).

---

## Tests

`npm test` (Vitest) covers the logic worth owning:

- `money.test.ts` — HALF_UP rounding and float-drift-free summation.
- `extractInvoice.test.ts` — the currency gate: valid currency, bare-`$`→USD,
  **F15** (null), **F16** (JPY), casing/whitespace normalization.
- `exchangeRates.test.ts` — base→base=1 handling and rate-service failures (mocked fetch).
- `buildInvoice.test.ts` — conversion into all three currencies + the mismatch/no-total notes.
