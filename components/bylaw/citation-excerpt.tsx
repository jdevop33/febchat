'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CitationExcerptProps {
  excerpt?: string;
  expanded: boolean;
  relevance?: string;
  financialImpact?: string;
}

export function CitationExcerpt({
  excerpt,
  expanded,
  relevance,
  financialImpact
}: CitationExcerptProps) {
  if (!excerpt && !relevance && !financialImpact) {
    return null;
  }
  
  return (
    <>
      {excerpt && (
        <div
          className={cn(
            'mt-2 border-l-2 border-blue-300 pl-3 text-sm dark:border-blue-700',
            expanded ? '' : 'line-clamp-3',
          )}
          aria-hidden="true"
          role="presentation"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="italic">{excerpt}</p>
        </div>
      )}

      {(relevance || financialImpact) && expanded && (
        <div
          className="mt-3 space-y-2 text-sm"
          aria-hidden="true"
          role="presentation"
          onClick={(e) => e.stopPropagation()}
        >
          {relevance && (
            <div className="rounded bg-blue-50 p-2 dark:bg-blue-900/20">
              <span className="font-medium">Relevance:</span> {relevance}
            </div>
          )}

          {financialImpact && (
            <div className="rounded border-l-2 border-amber-400 bg-amber-50 p-2 dark:bg-amber-900/20">
              <span className="font-medium">Financial Impact:</span>{' '}
              {financialImpact}
            </div>
          )}
        </div>
      )}
    </>
  );
}
