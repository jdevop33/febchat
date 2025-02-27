'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './ui/card';
import {
  FileText,
  ExternalLink,
  Copy,
  FileDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner';

interface BylawCitationProps {
  bylawNumber: string;
  section: string;
  title?: string;
  excerpt?: string;
  relevance?: string;
  className?: string;
  effectiveDate?: string;
  financialImpact?: string;
}

export function BylawCitation({
  bylawNumber,
  section,
  title,
  excerpt,
  relevance,
  effectiveDate,
  financialImpact,
  className,
}: BylawCitationProps) {
  const [expanded, setExpanded] = useState(false);
  const formattedTitle = title || `Bylaw No. ${bylawNumber}`;

  const copyToClipboard = () => {
    const content = `${formattedTitle}, Section ${section}: ${excerpt}`;
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  return (
    <Card
      className={cn(
        'my-3 border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20',
        className,
      )}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <FileText size={16} className="shrink-0" />
            <div className="font-medium">{formattedTitle}</div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {effectiveDate && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs dark:bg-blue-900/40">
                Effective: {effectiveDate}
              </span>
            )}
            <span>Section {section}</span>
          </div>
        </div>

        {excerpt && (
          <div
            className={cn(
              'mt-2 border-l-2 border-blue-300 pl-3 text-sm dark:border-blue-700',
              expanded ? '' : 'line-clamp-3',
            )}
          >
            <p className="italic">{excerpt}</p>
          </div>
        )}

        {(relevance || financialImpact) && expanded && (
          <div className="mt-3 space-y-2 text-sm">
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

        <div className="mt-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp size={14} className="mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={14} className="mr-1" />
                Show More
              </>
            )}
          </Button>

          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={copyToClipboard}
                >
                  <Copy size={14} className="mr-1" />
                  Copy
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy citation to clipboard</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => {
                    window.open(
                      `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}?section=${section}`,
                      '_blank',
                    );
                  }}
                >
                  <ExternalLink size={14} className="mr-1" />
                  View Full Bylaw
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Open the full bylaw text in a new tab
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => {
                    // In a real implementation, this would generate a PDF report
                    toast.success('Financial analysis report downloading...');
                  }}
                >
                  <FileDown size={14} className="mr-1" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export as financial report</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
