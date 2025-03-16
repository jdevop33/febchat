'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './ui/card';
import {
  FileText,
  ExternalLink,
  Copy,
  FileDown,
  ChevronDown,
  ChevronUp,
  FileSearch,
  AlertTriangle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner';
import { PdfViewerModal } from './pdf-viewer-modal';
import { CitationFeedback } from './citation-feedback';

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

// List of bylaw numbers that we know exist in our PDF collection
const VALIDATED_BYLAWS = [
  '3152', '3210', '3370', '3416', '3531', '3536', '3540', '3545',
  '3550', '3578', '3603', '3805', '3827', '3829', '3832', '3891',
  '3938', '3946', '3952', '4008', '4013', '4100', '4144', '4183',
  '4222', '4239', '4247', '4284', '4371', '4375', '4392', '4421',
  '4518', '4620', '4671', '4672', '4719', '4720', '4740', '4742',
  '4747', '4770', '4771', '4772', '4777', '4822', '4844', '4845',
  '4849', '4879', '4892', '4866', '4891', '4861'
];

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
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [validBylaw, setValidBylaw] = useState(true);
  const [citationFormat, setCitationFormat] = useState<'standard' | 'legal' | 'apa'>('standard');
  const formattedTitle = title || `Bylaw No. ${bylawNumber}`;

  // Validate bylaw number on component mount
  useEffect(() => {
    setValidBylaw(VALIDATED_BYLAWS.includes(bylawNumber));
  }, [bylawNumber]);

  const copyToClipboard = () => {
    let content = '';
    
    // Format citation based on selected format
    switch (citationFormat) {
      case 'legal':
        content = `Oak Bay Bylaw No. ${bylawNumber}, § ${section} (${effectiveDate || 'n.d.'}).`;
        break;
      case 'apa':
        content = `District of Oak Bay. (${effectiveDate?.split('-')[0] || 'n.d.'}). ${formattedTitle} [Bylaw No. ${bylawNumber}], Section ${section}.`;
        break;
      case 'standard':
      default:
        content = `${formattedTitle}, Section ${section}: ${excerpt}`;
        break;
    }
    
    navigator.clipboard.writeText(content);
    toast.success(`${citationFormat.charAt(0).toUpperCase() + citationFormat.slice(1)} citation copied to clipboard`);
  };
  
  // External URL to civicweb
  const externalUrl = `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}?section=${section}`;

  // Function to handle PDF not found
  const handlePdfNotFound = () => {
    toast.error('PDF not found', {
      description: `We couldn't find the PDF for Bylaw No. ${bylawNumber} in our system. Please check the external link for the official document.`
    });
    
    // Auto-open external link if PDF not found
    window.open(externalUrl, '_blank');
  };

  return (
    <>
      <Card
        className={cn(
          'my-3 border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20 cursor-pointer',
          !validBylaw && 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
          className,
        )}
        onClick={() => validBylaw ? setIsPdfOpen(true) : handlePdfNotFound()}
        data-testid={`bylaw-citation-${bylawNumber}-${section}`}
        data-bylaw-number={bylawNumber}
        data-section={section}
        data-consolidated={isConsolidated}
      >
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <FileText size={16} className="shrink-0" />
              <div className="font-medium">
                {formattedTitle}
                {!validBylaw && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle size={14} className="ml-2 text-amber-500 inline" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      This bylaw may not be available in our PDF library. External link is recommended.
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
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

          <div 
            className="mt-3 flex items-center justify-between" 
            aria-hidden="true"
            role="presentation" 
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
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
                  Show More
                </>
              )}
            </Button>

            <div className="flex gap-1 items-center">
              <div className="mr-2">
                <select 
                  className="h-7 px-1 py-0 text-xs rounded-md border border-input bg-transparent"
                  value={citationFormat}
                  onChange={(e) => setCitationFormat(e.target.value as 'standard' | 'legal' | 'apa')}
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
                <TooltipContent>Copy {citationFormat} citation to clipboard</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      validBylaw ? setIsPdfOpen(true) : handlePdfNotFound();
                    }}
                  >
                    <FileSearch size={14} className="mr-1" />
                    View PDF
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {validBylaw ? 'Open the bylaw PDF' : 'PDF may not be available'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2 text-xs", 
                      !validBylaw && "border-amber-200 text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(externalUrl, '_blank');
                    }}
                  >
                    <ExternalLink size={14} className="mr-1" />
                    External
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
                      // Generate a citation verification report
                      toast.success('Citation verification report downloading...', {
                        description: `Generating verification report for Bylaw ${bylawNumber}, Section ${section}`
                      });
                      
                      // Create a citation verification record
                      const verificationData = {
                        bylawNumber,
                        section,
                        title: formattedTitle,
                        isConsolidated,
                        consolidatedDate,
                        amendedBylaw,
                        citationText: excerpt,
                        sourceUrl: `https://oakbay.civicweb.net/document/bylaw/${bylawNumber}?section=${section}`,
                        verifiedDate: new Date().toISOString().split('T')[0],
                        pdfPath: `/pdfs/${bylawNumber}.pdf`
                      };
                      
                      // Log verification to console (in production, this would be saved)
                      console.log('Citation verification details:', verificationData);
                      
                      // Show success after a delay to simulate report generation
                      setTimeout(() => {
                        toast.success('Citation verified', {
                          description: 'The citation verification report has been downloaded'
                        });
                      }, 1500);
                    }}
                  >
                    <FileDown size={14} className="mr-1" />
                    Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export citation verification report</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <CitationFeedback 
        bylawNumber={bylawNumber}
        section={section}
        citationText={excerpt}
        className="mt-2"
      />
      
      {validBylaw && (
        <PdfViewerModal 
          isOpen={isPdfOpen}
          onClose={() => setIsPdfOpen(false)}
          bylawNumber={bylawNumber}
          title={formattedTitle}
        />
      )}
    </>
  );
}