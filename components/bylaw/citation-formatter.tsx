'use client';

import React from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { formatCitation } from '@/lib/utils/citation-formatter';

interface CitationFormatterProps {
  bylawNumber: string;
  title: string;
  section: string;
  isConsolidated: boolean;
  consolidatedDate?: string;
  effectiveDate?: string;
  excerpt?: string;
  citationFormat: 'standard' | 'legal' | 'apa';
  setCitationFormat: (format: 'standard' | 'legal' | 'apa') => void;
}

export function CitationFormatter({
  bylawNumber,
  title,
  section,
  isConsolidated,
  consolidatedDate,
  effectiveDate,
  excerpt,
  citationFormat,
  setCitationFormat,
}: CitationFormatterProps) {
  const copyToClipboard = () => {
    // Format citation using the utility function
    const content = formatCitation(
      {
        bylawNumber,
        title,
        section,
        isConsolidated,
        consolidatedDate,
        effectiveDate,
        excerpt,
      },
      citationFormat,
    );

    // Check if navigator is available (only in browser context)
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(content)
        .then(() => {
          toast.success(
            `${citationFormat.charAt(0).toUpperCase() + citationFormat.slice(1)} citation copied to clipboard`,
          );
        })
        .catch((err) => {
          console.error('Failed to copy text: ', err);
          toast.error('Failed to copy to clipboard');
        });
    } else {
      // Fallback for non-browser environments (SSR)
      console.log('Clipboard API not available');
      toast.info('Copy function is only available in the browser');
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="mr-2">
        <select
          className="h-7 rounded-md border border-input bg-transparent px-1 py-0 text-xs"
          value={citationFormat}
          onChange={(e) =>
            setCitationFormat(e.target.value as 'standard' | 'legal' | 'apa')
          }
          onClick={(e) => e.stopPropagation()}
        >
          <option value="standard">Standard</option>
          <option value="legal">Legal</option>
          <option value="apa">APA</option>
        </select>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard();
            }}
          >
            <Copy size={14} className="mr-1" />
            Copy
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Copy {citationFormat} citation to clipboard
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
