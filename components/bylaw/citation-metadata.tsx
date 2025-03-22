'use client';

import React from 'react';

interface CitationMetadataProps {
  effectiveDate?: string;
  isConsolidated: boolean;
  consolidatedDate?: string;
  formattedSection: string;
}

export function CitationMetadata({
  effectiveDate,
  isConsolidated,
  consolidatedDate,
  formattedSection,
}: CitationMetadataProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {effectiveDate && (
        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs dark:bg-blue-900/40">
          Effective: {effectiveDate}
        </span>
      )}
      {isConsolidated && (
        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs dark:bg-purple-900/40">
          Consolidated{consolidatedDate ? `: ${consolidatedDate}` : ''}
        </span>
      )}
      <span>{formattedSection}</span>
    </div>
  );
}
