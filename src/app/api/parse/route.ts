import { NextResponse } from "next/server";
import { buildConvertedInvoice } from "@/lib/buildInvoice";
import { AppError, FileTooLargeError, NoFileError, NotPdfError } from "@/lib/errors";
import { getRates } from "@/lib/exchangeRates";
import { extractInvoice, resolveCurrency } from "@/lib/extractInvoice";
import type { ApiError } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_MB = 10;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const PDF_MAGIC = "%PDF-";

/** POST /api/parse — multipart form with a single `file` field (the PDF). */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new NoFileError(); // body wasn't a multipart form
    }
    const file = form.get("file");

    // F4 — reject anything that isn't a single uploaded file.
    if (!(file instanceof File) || file.size === 0) throw new NoFileError();
    if (file.size > MAX_FILE_BYTES) throw new FileTooLargeError(MAX_FILE_MB);

    const buffer = Buffer.from(await file.arrayBuffer());

    // F4 — defense in depth: trust the bytes, not just the declared MIME type.
    // The PDF spec allows the "%PDF-" header within the first 1024 bytes, not
    // strictly at offset 0, so scan the head rather than only the first 5 bytes.
    const declaredPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const looksPdf = buffer.subarray(0, 1024).toString("latin1").includes(PDF_MAGIC);
    if (!declaredPdf || !looksPdf) throw new NotPdfError();

    // F5 — let Claude read the PDF and extract structured data.
    const extraction = await extractInvoice(buffer.toString("base64"));

    // F11/F15/F16 — validate the detected currency before doing anything else.
    const { currency, confidence } = resolveCurrency(extraction);

    // F12/F13 — fetch live ECB rates and convert.
    const rates = await getRates(currency);
    const result = buildConvertedInvoice(extraction, currency, confidence, rates);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      const body: ApiError = { code: err.code, message: err.message };
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Unexpected error in /api/parse:", err);
    const body: ApiError = {
      code: "INTERNAL",
      message: "Something went wrong while processing the invoice. Please try again.",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
