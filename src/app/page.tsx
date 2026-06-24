"use client";

import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ResultsTable } from "@/components/ResultsTable";
import { useParseInvoice } from "@/hooks/useParseInvoice";
import type { ApiError } from "@/lib/types";

export default function Home() {
  const parse = useParseInvoice();
  const [fileName, setFileName] = useState<string | null>(null);
  // Client-side validation errors (wrong type / too large) live separately
  // from server-side ApiErrors returned by the mutation.
  const [clientError, setClientError] = useState<ApiError | null>(null);

  const error = clientError ?? (parse.error as ApiError | null);

  const handleFile = (file: File) => {
    setClientError(null);
    setFileName(file.name);
    parse.reset();
    parse.mutate(file);
  };

  return (
    <main className="page">
      <header className="page__head">
        <h1>Invoice Parser</h1>
        <p className="page__sub">
          Upload a PDF invoice and see every amount in <strong>USD</strong>, <strong>EUR</strong>{" "}
          and <strong>GBP</strong>. The source currency is read from the PDF; the other two are
          converted at live exchange rates.
        </p>
      </header>

      <Dropzone
        onFile={handleFile}
        onReject={(apiError) => {
          parse.reset();
          setClientError(apiError);
        }}
        disabled={parse.isPending}
      />

      {fileName && !error && (
        <p className="filename">
          {parse.isPending ? "Reading" : "Read"}: <strong>{fileName}</strong>
        </p>
      )}

      {parse.isPending && (
        <div className="loading" role="status">
          <span className="spinner" aria-hidden="true" />
          Reading invoice with Claude…
        </div>
      )}

      {error && (
        <ErrorBanner
          error={error}
          onDismiss={() => {
            setClientError(null);
            parse.reset();
          }}
        />
      )}

      {parse.data && !parse.isPending && <ResultsTable invoice={parse.data} />}
    </main>
  );
}
