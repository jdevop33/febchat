'use client';

import React from 'react';
import { ExternalLink, FileSearch, FileDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CitationActionsProps {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  onViewPdf: () => void;
  onViewExternalPdf: () => void;
  onViewOfficialSite: () => void;
  onExportReport: () => void;
  validBylaw: boolean;
}

export function CitationActions({
  expanded,
  setExpanded,
  onViewPdf,
  onViewExternalPdf,
  onViewOfficialSite,
  onExportReport,
  validBylaw
}: CitationActionsProps) {
  return (
    <div
      className="mt-3 flex items-center justify-between"
      aria-hidden="true"
      role="presentation"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex gap-2">
        <Button
          variant={expanded ? "ghost" : "outline"}
          size="sm"
          className={cn(
            "h-8 px-2 text-xs",
            !expanded && "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? (
            <>
              <ChevronUp size={14} className="mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown size={14} className="mr-1" />
              Show Options
            </>
          )}
        </Button>
        
        {!expanded && (
          <Button
            variant="secondary"
            size="sm"
            className="h-8 px-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:hover:bg-blue-900/80 dark:text-blue-300"
            onClick={(e) => {
              e.stopPropagation();
              onViewPdf();
            }}
          >
            <FileSearch size={14} className="mr-1" />
            View Full PDF
          </Button>
        )}
      </div>

      {expanded && (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewPdf();
                }}
              >
                <FileSearch size={14} className="mr-1" />
                View PDF
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {validBylaw
                ? 'Open the bylaw PDF'
                : 'PDF may not be available'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 px-2 text-xs',
                  !validBylaw &&
                    'border-amber-200 text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300',
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewExternalPdf();
                }}
              >
                <ExternalLink size={14} className="mr-1" />
                Open PDF
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open the PDF in a new tab</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 px-2 text-xs',
                  !validBylaw &&
                    'border-amber-200 text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300',
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewOfficialSite();
                }}
              >
                <ExternalLink size={14} className="mr-1" />
                Official
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Open the full bylaw text on the official website
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onExportReport();
                }}
              >
                <FileDown size={14} className="mr-1" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Export citation verification report
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
