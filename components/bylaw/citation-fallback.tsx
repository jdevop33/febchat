"use client";

import { getExternalPdfUrl } from "@/lib/utils/bylaw-shared";
import React from "react";

interface CitationFallbackProps {
  bylawNumber: string;
  formattedTitle: string;
  error?: Error;
}

export function CitationFallback({
  bylawNumber,
  formattedTitle,
  error,
}: CitationFallbackProps) {
  // Get the external URL for linking to official source
  let externalUrl = "https://www.oakbay.ca/municipal-services/bylaws";

  try {
    // Try to get the URL from our utility, but don't fail if it doesn't work
    if (bylawNumber && getExternalPdfUrl) {
      externalUrl = getExternalPdfUrl(bylawNumber);
    }
  } catch (err) {
    console.error("Error getting external PDF URL:", err);
    // Fallback to a predictable URL format
    externalUrl = `https://www.oakbay.ca/municipal-services/bylaws/bylaw-${bylawNumber}`;
  }

  return (
    <div className="my-3 rounded-lg border border-amber-200 bg-amber-50/40 p-2">
      <p className="text-sm text-amber-800">
        {error
          ? `Error displaying citation: ${error.message}`
          : `Bylaw ${bylawNumber}: ${formattedTitle} - citation could not be displayed properly`}
      </p>
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 flex items-center gap-1 text-xs text-blue-600 underline"
        aria-label={`View Bylaw ${bylawNumber} PDF on official Oak Bay website (opens in new tab)`}
      >
        <span>View PDF on official site</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="inline-block"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    </div>
  );
}
