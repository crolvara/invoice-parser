import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AiServiceError, CurrencyNotIdentifiedError, UnreadablePdfError, UnsupportedCurrencyError } from "./errors";
import { isSupportedCurrency, type CurrencyConfidence, type SupportedCurrency } from "./types";

const MODEL = "claude-sonnet-4-6";

/**
 * What we ask Claude to return. The model does the locale-aware work —
 * normalizing "19.572,00" or "$25.00" to plain decimals and resolving the
 * currency to an ISO code — so the app never parses number formats by regex.
 */
const ExtractionSchema = z.object({
  sourceCurrency: z
    .string()
    .nullable()
    .describe(
      "ISO 4217 code of the invoice currency (e.g. USD, EUR, GBP, JPY). null if the invoice shows no currency evidence at all.",
    ),
  currencyConfidence: z
    .enum(["explicit", "symbol-only", "none"])
    .describe(
      "explicit = ISO code or unambiguous symbol (EUR, GBP, €, £); symbol-only = only a bare '$'; none = no currency anywhere.",
    ),
  lineItems: z
    .array(
      z.object({
        description: z.string().describe("The line item description as printed."),
        amount: z
          .number()
          .describe("The line amount as a plain decimal (dot separator). Discounts/credits are negative."),
      }),
    )
    .describe("One entry per visible line-item row. Skip empty template rows."),
  total: z
    .number()
    .nullable()
    .describe("The invoice's stated grand total / amount due as a plain decimal, or null if none is stated."),
});

export type RawExtraction = z.infer<typeof ExtractionSchema>;

const PROMPT = `You are an expert invoice parser. Read the attached PDF invoice and extract its data.

Rules:
- Numbers: return every monetary value as a plain decimal using a dot as the decimal separator. Convert any localized formatting first. Examples: European "19.572,00" -> 19572.00; US "1,234.56" -> 1234.56; "$25.00" -> 25.00.
- lineItems: one entry per visible line-item row, with its description and its line amount exactly as printed. Discounts or credits are negative amounts. Do not invent, merge, or split rows. Skip empty template/placeholder rows.
- total: the invoice's stated grand total / amount due, as a number. If the invoice shows no total, or only an empty or zero placeholder total, set total to null.
- sourceCurrency: the ISO 4217 code of the currency the invoice is denominated in.
  - If the invoice clearly states or symbolizes a currency (e.g. "EUR", "€", "GBP", "£"), return that ISO code with currencyConfidence "explicit".
  - If the ONLY currency signal is a bare "$" with no other indication, return "USD" with currencyConfidence "symbol-only".
  - If there is NO currency evidence anywhere on the invoice, return null for sourceCurrency and "none" for currencyConfidence. Do not guess.
- Ignore tax IDs / VAT numbers when deciding the currency — a company's country does not determine the invoice currency.`;

// Instantiated lazily so importing this module (e.g. in unit tests of the pure
// helpers below) doesn't require ANTHROPIC_API_KEY to be set.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

/** Send the PDF to Claude and return the structured extraction. (F5) */
export async function extractInvoice(pdfBase64: string): Promise<RawExtraction> {
  let response;
  try {
    response = await getClient().messages.parse({
      model: MODEL,
      // Headroom for invoices with many line items; billed on actual output,
      // so this is free for small invoices and avoids truncating large ones.
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(ExtractionSchema) },
    });
  } catch (err) {
    // Surface "couldn't read the PDF" vs. a transient service failure where we can.
    if (err instanceof Anthropic.BadRequestError) throw new UnreadablePdfError();
    throw new AiServiceError();
  }

  const parsed = response.parsed_output;
  if (!parsed) throw new UnreadablePdfError();
  return parsed;
}

/**
 * Validate the extracted currency against the supported set. Pure and
 * side-effect-free so it can be unit-tested without the SDK. (F11, F15, F16)
 */
export function resolveCurrency(extraction: RawExtraction): {
  currency: SupportedCurrency;
  confidence: CurrencyConfidence;
} {
  const { sourceCurrency, currencyConfidence } = extraction;

  if (!sourceCurrency || currencyConfidence === "none") {
    throw new CurrencyNotIdentifiedError(); // F15
  }

  const code = sourceCurrency.trim().toUpperCase();
  if (!isSupportedCurrency(code)) {
    throw new UnsupportedCurrencyError(code); // F16
  }

  // currencyConfidence is "explicit" or "symbol-only" here.
  return { currency: code, confidence: currencyConfidence };
}
