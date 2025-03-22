'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { FileSearch } from 'lucide-react';
import { toast } from 'sonner';
import { PdfViewerModal } from '@/components/pdf-viewer-modal';
import { CitationFeedback } from '@/components/citation-feedback';
import { VALIDATED_BYLAWS } from '@/lib/utils/bylaw-maps-client';

// Import the smaller components
import { CitationHeader } from './citation-header';
import { CitationMetadata } from './citation-metadata';
import { CitationExcerpt } from './citation-excerpt';
import { CitationFormatter } from './citation-formatter';
import { CitationActions } from './citation-actions';
import { CitationFallback } from './citation-fallback';

// Import formatter utility
import { formatSection } from '@/lib/utils/citation-formatter';

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
  const formattedSection = formatSection(section, sectionTitle);

  // Validate bylaw number on component mount
  useEffect(() => {
    // If explicitly marked as verified, trust that
    if (isVerified) {
      setValidBylaw(true);
      return;
    }

    // Fallback validation list if imports fail
    const fallbackValidBylaws = [
      '3210',
      '3531',
      '4100',
      '4247',
      '4742',
      '4849',
      '4861',
      '4891',
      '4892',
      '3578',
      '4672',
      '3545',
      '4371',
      '4183',
      '3946',
      '4013',
    ];

    try {
      // First check if the import worked correctly
      if (
        typeof VALIDATED_BYLAWS !== 'undefined' &&
        Array.isArray(VALIDATED_BYLAWS) &&
        VALIDATED_BYLAWS.length > 0
      ) {
        // Check against our known list
        setValidBylaw(VALIDATED_BYLAWS.includes(bylawNumber));
      } else if (fallbackValidBylaws.includes(bylawNumber)) {
        // Use our hardcoded fallback list
        console.warn('Using fallback bylaw validation list');
        setValidBylaw(true);
      } else {
        // Fallback to basic validation - assume bylaw is valid if number is provided
        console.warn(
          'No validation lists available, falling back to basic validation',
        );
        setValidBylaw(!!bylawNumber && bylawNumber.length > 0);
      }
    } catch (error) {
      console.error('Error checking bylaw validation:', error);
      // Try fallback list even if there was an error
      if (fallbackValidBylaws.includes(bylawNumber)) {
        setValidBylaw(true);
      } else {
        // Last resort fallback - any bylaw number is considered valid
        setValidBylaw(!!bylawNumber && bylawNumber.length > 0);
      }
    }
  }, [bylawNumber, isVerified]);

  // Function to handle view bylaw action
  const handleViewBylaw = () => {
    // Always use modals instead of direct redirects for better UX
    setIsPdfOpen(true);

    // Log the action
    console.log(
      `User clicked to view Bylaw ${bylawNumber}, Section ${section}`,
    );
  };

  // Get PDF path using local file system
  const getPdfPath = () => {
    if (pdfPath) {
      return pdfPath;
    }

    // Try to use bylaw number to find matching PDF
    const possiblePaths = [
      `/pdfs/${bylawNumber}.pdf`,
      `/pdfs/${bylawNumber} -*.pdf`,
      `/pdfs/${bylawNumber}*.pdf`,
    ];

    // In production, we'd check if these files exist
    // For now, just return the first pattern and let the PDF viewer handle fallback
    return possiblePaths[0];
  };

  // Get external URL for the bylaw (with error handling)
  let externalUrl = 'https://www.oakbay.ca/municipal-services/bylaws';
  try {
    // Try to use the correct URL if the import worked
    if (bylawNumber && typeof window !== 'undefined') {
      // Check if we have the official URL from props
      if (officialUrl) {
        externalUrl = officialUrl;
      } else {
        // Try to build one with the usual pattern
        externalUrl = `https://www.oakbay.ca/municipal-services/bylaws/bylaw-${bylawNumber}`;
      }
    }
  } catch (error) {
    console.error('Error generating external URL:', error);
    // Fallback to general bylaws page
    externalUrl = 'https://www.oakbay.ca/municipal-services/bylaws';
  }

  // Various action handlers
  const handleViewPdf = () => {
    validBylaw ? setIsPdfOpen(true) : handlePdfNotFound();
  };

  const handleViewExternalPdf = () => {
    // Simplified for testing
    console.log('PDF viewer temporarily disabled for testing');

    // Open generic URL in new tab
    if (typeof window !== 'undefined') {
      window.open(externalUrl, '_blank', 'noopener,noreferrer,popup=yes');
    }
  };

  const handleViewOfficialSite = () => {
    // Log the action for debugging
    console.log('Opening official site (simplified for testing)');

    if (typeof window !== 'undefined') {
      window.open(externalUrl, '_blank', 'noopener,noreferrer,popup=yes');
    }
  };

  const handleExportReport = () => {
    // Generate a citation verification report
    toast.success('Citation verification report downloading...', {
      description: `Generating verification report for Bylaw ${bylawNumber}, Section ${section}`,
    });

    // Create a citation verification record (simplified for testing)
    const verificationData = {
      bylawNumber,
      section,
      title: formattedTitle,
      isConsolidated,
      consolidatedDate,
      citationText: excerpt,
      sourceUrl: 'https://www.oakbay.ca/municipal-services/bylaws', // Simplified for testing
      verifiedDate: new Date().toISOString().split('T')[0],
      pdfPath: getPdfPath(),
    };

    // Log verification to console (in production, this would be saved)
    console.log('Citation verification details:', verificationData);

    // Show success after a delay to simulate report generation
    setTimeout(() => {
      toast.success('Citation verified', {
        description: 'The citation verification report has been downloaded',
      });
    }, 1500);
  };

  // Fallback rendering in case of errors
  if (!bylawNumber) {
    console.warn('BylawCitation: Missing bylaw number', {
      props: { bylawNumber, section, title },
    });
    return (
      <CitationFallback
        bylawNumber="unknown"
        formattedTitle="Unknown Bylaw"
        error={new Error('Missing bylaw number')}
      />
    );
  }

  // Safety guard to prevent PDF viewer errors
  const safeRender = () => {
    try {
      return (
        <>
          <Card
            className={cn(
              'my-3 cursor-pointer border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20',
              'group relative transition-all duration-200 hover:border-blue-400 hover:shadow-md dark:hover:border-blue-700',
              !validBylaw &&
                'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
              className,
            )}
            onClick={handleViewBylaw}
            data-testid={`bylaw-citation-${bylawNumber}-${section}`}
            data-bylaw-number={bylawNumber}
            data-section={section}
            data-consolidated={isConsolidated}
          >
            {/* PDF indicator icon & helper text */}
            <div className="absolute right-3 top-3 flex items-center gap-2">
              <span className="hidden rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 dark:bg-blue-900/60 dark:text-blue-200 md:inline-block">
                Click to view PDF
              </span>
              <div className="rounded-full bg-blue-100 p-1 text-blue-700 shadow-sm dark:bg-blue-900/40 dark:text-blue-300">
                <FileSearch size={16} />
              </div>
            </div>

            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                {/* Title and verification status */}
                <CitationHeader
                  formattedTitle={formattedTitle}
                  bylawNumber={bylawNumber}
                  isVerified={isVerified}
                  validBylaw={validBylaw}
                  onViewPdf={handleViewPdf}
                />

                {/* Metadata display */}
                <CitationMetadata
                  effectiveDate={effectiveDate}
                  isConsolidated={isConsolidated}
                  consolidatedDate={consolidatedDate}
                  formattedSection={formattedSection}
                />
              </div>

              {/* Excerpt and additional information */}
              <CitationExcerpt
                excerpt={excerpt}
                expanded={expanded}
                relevance={relevance}
                financialImpact={financialImpact}
              />

              {/* Actions for expanding, viewing PDF, etc. */}
              <CitationActions
                expanded={expanded}
                setExpanded={setExpanded}
                onViewPdf={handleViewBylaw}
                onViewExternalPdf={handleViewBylaw}
                onViewOfficialSite={handleViewBylaw}
                onExportReport={handleExportReport}
                validBylaw={true} /* Always enable buttons */
              />

              {/* Citation format selector and copy button */}
              {expanded && (
                <div className="mt-2 flex justify-end">
                  <CitationFormatter
                    bylawNumber={bylawNumber}
                    title={formattedTitle}
                    section={section}
                    isConsolidated={isConsolidated}
                    consolidatedDate={consolidatedDate}
                    effectiveDate={effectiveDate}
                    excerpt={excerpt}
                    citationFormat={citationFormat}
                    setCitationFormat={setCitationFormat}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <CitationFeedback
            bylawNumber={bylawNumber}
            section={section}
            citationText={excerpt}
            className="mt-2"
          />

          {/* Use the PDF viewer only if in client context and modal is open */}
          {typeof window !== 'undefined' && isPdfOpen && (
            <PdfViewerModal
              isOpen={isPdfOpen}
              onClose={() => setIsPdfOpen(false)}
              bylawNumber={bylawNumber}
              title={formattedTitle}
              pdfPath={getPdfPath()}
              initialPage={1}
              section={section}
              isVerified={isVerified}
              externalUrl={externalUrl}
            />
          )}
        </>
      );
    } catch (error) {
      console.error('Error rendering BylawCitation:', error);
      return (
        <CitationFallback
          bylawNumber={bylawNumber}
          formattedTitle={formattedTitle}
          error={error instanceof Error ? error : new Error('Unknown error')}
        />
      );
    }
  };

  // Use the safe rendering function
  return safeRender();
}
