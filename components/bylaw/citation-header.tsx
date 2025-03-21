'use client';

import React from 'react';
import { FileText, AlertTriangle, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CitationHeaderProps {
  formattedTitle: string;
  bylawNumber: string;
  isVerified: boolean;
  validBylaw: boolean;
  onViewPdf: () => void;
}

export function CitationHeader({
  formattedTitle,
  bylawNumber,
  isVerified,
  validBylaw,
  onViewPdf
}: CitationHeaderProps) {
  return (
    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
      <FileText size={16} className="shrink-0" />
      <div className="font-medium flex items-center">
        {formattedTitle}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="link" 
              size="sm" 
              className="px-1 text-blue-600 dark:text-blue-400 font-medium underline hover:text-blue-800 dark:hover:text-blue-300"
              onClick={(e) => {
                e.stopPropagation();
                onViewPdf();
              }}
            >
              <FileSearch size={14} className="mr-1" />
              View PDF
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open the PDF viewer</TooltipContent>
        </Tooltip>
        {isVerified ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                Verified
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              This citation has been verified against official sources
            </TooltipContent>
          </Tooltip>
        ) : (
          !validBylaw && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle
                  size={14}
                  className="ml-2 inline text-amber-500"
                />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                This bylaw may not be available in our PDF library.
                External link is recommended.
              </TooltipContent>
            </Tooltip>
          )
        )}
      </div>
    </div>
  );
}
