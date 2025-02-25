'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './ui/card';
import { BookOpen, FileText, ArrowUpRight, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface BylawCitationProps {
  bylawNumber: string;
  section: string;
  title?: string;
  excerpt?: string;
  className?: string;
}

export function BylawCitation({
  bylawNumber,
  section,
  title,
  excerpt,
  className,
}: BylawCitationProps) {
  const formattedTitle = title || `Bylaw No. ${bylawNumber}`;
  
  return (
    <Card className={cn("my-3 border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20", className)}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <FileText size={16} className="shrink-0" />
            <div className="font-medium">
              {formattedTitle}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Section {section}
          </div>
        </div>
        
        {excerpt && (
          <div className="mt-2 border-l-2 border-blue-300 dark:border-blue-700 pl-3 text-sm italic">
            {excerpt}
          </div>
        )}
        
        <div className="mt-3 flex justify-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs"
                onClick={() => {
                  // This would be replaced with actual URL in production
                  window.open(`https://oakbay.civicweb.net/document/bylaw/${bylawNumber}?section=${section}`, '_blank');
                }}
              >
                <ExternalLink size={14} className="mr-1" />
                View Full Bylaw
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open the full bylaw text in a new tab</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}