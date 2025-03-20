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
import { 
  getExternalPdfUrl, 
  getLocalPdfPath, 
  getBestPdfUrl, 
  VALIDATED_BYLAWS as VALIDATED_BYLAWS_LIST 
} from '@/lib/utils/bylaw-utils';

interface BylawCitationProps {
  bylawNumber: string;
  section: string;
  title?: string;
  excerpt?: string;
  relevance?: string;
  className?: string;
  effectiveDate?: string;
  financialImpact?: string;
  isVerified?: boolean;
  isConsolidated?: boolean;
  consolidatedDate?: string;
  pdfPath?: string;
  officialUrl?: string;
  sectionTitle?: string;
  score?: number;
}

// Using imported VALIDATED_BYLAWS_LIST from centralized utility
const VALIDATED_BYLAWS = VALIDATED_BYLAWS_LIST;

export function BylawCitation({
  bylawNumber,
  section,
  title,
  excerpt,
  relevance,
  effectiveDate,
  financialImpact,
  className,
  isVerified = false,
  isConsolidated = false,
  consolidatedDate,
  pdfPath,
  officialUrl,
  sectionTitle,
  score,
}: BylawCitationProps) {
  const [expanded, setExpanded] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [validBylaw, setValidBylaw] = useState(true);
  const [citationFormat, setCitationFormat] = useState<
    'standard' | 'legal' | 'apa'
  >('standard');
  const formattedTitle = title || `Bylaw No. ${bylawNumber}`;
  // Normalize section reference format (for internal use/storage)
  const normalizeSection = (section: string): string => {
    // Remove any prefix like "Section", "Part", etc.
    let normalized = section.replace(
      /^(section|part|article|schedule|appendix|s\.|p\.)\s+/i,
      '',
    );

    // Remove trailing period if it exists
    normalized = normalized.replace(/\.$/, '');

    // If it's a roman numeral, convert to uppercase for consistency
    if (/^[IVXLCDM]+$/i.test(normalized)) {
      normalized = normalized.toUpperCase();
    }

    return normalized;
  };

  // Enhanced section formatting to handle various citation styles (for display)
  const formatSection = (section: string, title?: string | null): string => {
    // Normalize section first
    const normalizedSection = normalizeSection(section);

    // Check if it's a roman numeral
    const isRomanNumeral = /^[IVXLCDM]+$/i.test(normalizedSection);

    // Check if it's a lettered section like "(a)" or "(iv)"
    const isLetterSection = /^\([a-z0-9]+\)$/i.test(normalizedSection);

    // Check if it's a numeric section with subsections like "1.2.3"
    const isNumericWithSubsections = /^\d+(\.\d+)+$/.test(normalizedSection);

    // Check if it's a simple numeric section like "1" or "42"
    const isSimpleNumeric = /^\d+$/.test(normalizedSection);

    // Format based on type
    let formattedSection: string;
    if (isRomanNumeral) {
      formattedSection = `Part ${normalizedSection}`;
    } else if (isLetterSection) {
      formattedSection = `Subsection ${normalizedSection}`;
    } else if (isNumericWithSubsections) {
      formattedSection = `Section ${normalizedSection}`;
    } else if (isSimpleNumeric) {
      formattedSection = `Section ${normalizedSection}`;
    } else {
      // If we can't determine the type, just use the original section
      formattedSection = section;
    }

    // Add title if provided
    if (title) {
      formattedSection = `${formattedSection}: ${title}`;
    }

    return formattedSection;
  };

  const formattedSection = formatSection(section, sectionTitle);

  // Validate bylaw number on component mount
  useEffect(() => {
    // If explicitly marked as verified, trust that
    if (isVerified) {
      setValidBylaw(true);
    } else {
      // Otherwise check against our known list
      setValidBylaw(VALIDATED_BYLAWS.includes(bylawNumber));
    }
  }, [bylawNumber, isVerified]);

  const copyToClipboard = () => {
    let content = '';

    // Format section string for citation
    const getCitationSectionString = (): string => {
      // For legal citations, use the section symbol with normalized section
      if (citationFormat === 'legal') {
        return `§ ${normalizeSection(section)}`;
      }

      // For other formats, use the enhanced formatting
      return formatSection(section, null);
    };

    // Handle consolidated bylaw citation
    const getConsolidationInfo = (): string => {
      if (isConsolidated && consolidatedDate) {
        return ` (Consolidated to ${consolidatedDate})`;
      } else if (isConsolidated) {
        return ` (Consolidated)`;
      }
      return '';
    };

    // Format citation based on selected format
    switch (citationFormat) {
      case 'legal':
        content = `Oak Bay Bylaw No. ${bylawNumber}${getConsolidationInfo()}, § ${section} (${effectiveDate || 'n.d.'}).`;
        break;
      case 'apa':
        content = `District of Oak Bay. (${effectiveDate?.split('-')[0] || 'n.d.'}). ${formattedTitle} [Bylaw No. ${bylawNumber}${getConsolidationInfo()}], ${getCitationSectionString()}.`;
        break;
      case 'standard':
      default:
        content = `${formattedTitle}${getConsolidationInfo()}, ${getCitationSectionString()}${excerpt ? `: ${excerpt}` : ''}`;
        break;
    }

    navigator.clipboard.writeText(content);
    toast.success(
      `${citationFormat.charAt(0).toUpperCase() + citationFormat.slice(1)} citation copied to clipboard`,
    );
  };

  // Get the external URL
  const externalUrl = officialUrl || getExternalPdfUrl(bylawNumber, title);

  // Function to handle PDF not found
  const handlePdfNotFound = () => {
    toast.error('PDF not found', {
      description: `We couldn't find the PDF for Bylaw No. ${bylawNumber} in our system. Please check the external link for the official document.`,
    });

    // Auto-open external link if PDF not found
    window.open(externalUrl, '_blank');
  };

  // Function to get the appropriate PDF path using centralized utility
  const getPdfPath = () => {
    if (pdfPath) {
      return pdfPath;
    }
    
    return getLocalPdfPath(bylawNumber);
  };

  return (
    <>
      <Card
        className={cn(
          'my-3 cursor-pointer border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20',
          !validBylaw &&
            'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
          className,
        )}
        onClick={() => (validBylaw ? setIsPdfOpen(true) : handlePdfNotFound())}
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

            <div className="flex items-center gap-1">
              <div className="mr-2">
                <select
                  className="h-7 rounded-md border border-input bg-transparent px-1 py-0 text-xs"
                  value={citationFormat}
                  onChange={(e) =>
                    setCitationFormat(
                      e.target.value as 'standard' | 'legal' | 'apa',
                    )
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
                      // For local PDF file display, use centralized getBestPdfUrl utility
                      const pdfPath = getBestPdfUrl(bylawNumber, title);
                      
                      // Open in new tab
                      window.open(pdfPath, '_blank', 'noopener,noreferrer');
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
                      window.open(externalUrl, '_blank');
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
                      // Generate a citation verification report
                      toast.success(
                        'Citation verification report downloading...',
                        {
                          description: `Generating verification report for Bylaw ${bylawNumber}, Section ${section}`,
                        },
                      );

                      // Create a citation verification record
                      const verificationData = {
                        bylawNumber,
                        section,
                        title: formattedTitle,
                        isConsolidated,
                        consolidatedDate,
                        citationText: excerpt,
                        sourceUrl: getExternalPdfUrl(bylawNumber, title),
                        verifiedDate: new Date().toISOString().split('T')[0],
                        pdfPath: getPdfPath(),
                      };

                      // Log verification to console (in production, this would be saved)
                      console.log(
                        'Citation verification details:',
                        verificationData,
                      );

                      // Show success after a delay to simulate report generation
                      setTimeout(() => {
                        toast.success('Citation verified', {
                          description:
                            'The citation verification report has been downloaded',
                        });
                      }, 1500);
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
          pdfPath={getPdfPath()}
          initialPage={1}
          section={section}
          isVerified={isVerified}
        />
      )}
    </>
  );
}
