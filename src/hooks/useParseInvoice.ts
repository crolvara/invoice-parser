"use client";

import { useMutation } from "@tanstack/react-query";
import type { ApiError, ConvertedInvoice } from "@/lib/types";

/**
 * Uploads a PDF to /api/parse and returns the parsed + converted invoice.
 * On a non-2xx response, throws the structured ApiError so the UI can switch
 * on `error.code`.
 */
export function useParseInvoice() {
  return useMutation<ConvertedInvoice, ApiError, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      let res: Response;
      try {
        res = await fetch("/api/parse", { method: "POST", body: formData });
      } catch {
        throw {
          code: "INTERNAL",
          message: "Network error — couldn't reach the server. Check your connection and try again.",
        } satisfies ApiError;
      }

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        if (data && typeof data === "object" && "code" in data) {
          throw data as ApiError;
        }
        throw {
          code: "INTERNAL",
          message: "Unexpected server error. Please try again.",
        } satisfies ApiError;
      }

      // A 2xx with a missing/invalid body shouldn't happen, but guard so the UI
      // never lands in a silent "no error, no result" dead state.
      if (!data || typeof data !== "object") {
        throw {
          code: "INTERNAL",
          message: "The server returned an unexpected response. Please try again.",
        } satisfies ApiError;
      }

      return data as ConvertedInvoice;
    },
  });
}
