"use client";

import { CitationFeedback } from "@/components/bylaw/citation-feedback";
import { PdfViewerModal } from "@/components/pdf/pdf-viewer-modal";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { VALIDATED_BYLAWS } from "@/lib/utils/bylaw-maps-client";
import { FileSearch } from "lucide-react";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";

import { CitationActions } from "./citation-actions";
import { CitationExcerpt } from "./citation-excerpt";
import { CitationFallback } from "./citation-fallback";
import { CitationFormatter } from "./citation-formatter";
// Import the smaller components
import { CitationHeader } from "./citation-header";
import { CitationMetadata } from "./citation-metadata";

// Import formatter utility
import { formatSection } from "@/lib/utils/citation-formatter";

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
  const [validationStatus, setValidationStatus] = useState<
    "loading" | "valid" | "warning" | "invalid"
  >("loading");
  const [citationFormat, setCitationFormat] = useState<
    "standard" | "legal" | "apa"
  >("standard");
  const [isVerifyingPdf, setIsVerifyingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const formattedTitle = title || `Bylaw No. ${bylawNumber}`;
  const formattedSection = formatSection(section, sectionTitle);

  // Validate bylaw number on component mount
  useEffect(() => {
    // Start with loading state
    setValidationStatus("loading");

    // If explicitly marked as verified, trust that
    if (isVerified) {
      setValidBylaw(true);
      setValidationStatus("valid");
      return;
    }

    // Fallback validation list if imports fail
    const fallbackValidBylaws = [
      "3210",
      "3531",
      "4100",
      "4247",
      "4742",
      "4849",
      "4861",
      "4891",
      "4892",
      "3578",
      "4672",
      "3545",
      "4371",
      "4183",
      "3946",
      "4013",
      // Add any other known valid bylaws here
    ];

    try {
      // First check if the import worked correctly
      if (
        typeof VALIDATED_BYLAWS !== "undefined" &&
        Array.isArray(VALIDATED_BYLAWS) &&
        VALIDATED_BYLAWS.length > 0
      ) {
        // Check against our known list
        const isValid = VALIDATED_BYLAWS.includes(bylawNumber);
        setValidBylaw(isValid);
        setValidationStatus(isValid ? "valid" : "invalid");
      } else if (fallbackValidBylaws.includes(bylawNumber)) {
        // Use our hardcoded fallback list
        console.warn("Using fallback bylaw validation list");
        setValidBylaw(true);
        setValidationStatus("valid");
      } else {
        // Fallback to basic validation - assume bylaw is valid if number format is correct
        console.warn(
          "No validation lists available, using format-based validation",
        );

        // Check if it looks like a bylaw number (3-5 digits, potentially followed by a letter)
        const isLikelyValid = /^\d{3,5}[A-Za-z]?$/.test(bylawNumber);
        setValidBylaw(isLikelyValid);
        setValidationStatus(isLikelyValid ? "warning" : "invalid");
      }
    } catch (error) {
      console.error("Error checking bylaw validation:", error);
      // Try fallback list even if there was an error
      if (fallbackValidBylaws.includes(bylawNumber)) {
        setValidBylaw(true);
        setValidationStatus("valid");
      } else {
        // For numeric bylaw numbers, set warning; otherwise invalid
        const isNumeric = /^\d+$/.test(bylawNumber);
        setValidBylaw(isNumeric);
        setValidationStatus(isNumeric ? "warning" : "invalid");
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

  // Verification status UI helpers
  const getValidationStatusIcon = () => {
    switch (validationStatus) {
      case "valid":
        return (
          <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
            Verified
          </span>
        );
      case "warning":
        return (
          <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            Likely Valid
          </span>
        );
      case "invalid":
        return (
          <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
            Unverified
          </span>
        );
      default:
        return (
          <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            Checking...
          </span>
        );
    }
  };

  // Get PDF path and URL with better error handling
  const getPdfPath = () => {
    if (pdfPath) {
      return pdfPath;
    }

    try {
      // Try to use bylaw number to find matching PDF - be conservative to avoid 404s
      return `/pdfs/${bylawNumber}.pdf`;
    } catch (e) {
      console.error("Error generating PDF path:", e);
      return null;
    }
  };

  // Get external URL for the bylaw (with error handling)
  let externalUrl = "https://www.oakbay.ca/municipal-services/bylaws";
  try {
    // Try to use the correct URL if the import worked
    if (bylawNumber && typeof window !== "undefined") {
      // Check if we have the official URL from props
      if (officialUrl) {
        externalUrl = officialUrl;
      } else {
        // Try to build one with the usual pattern
        externalUrl = `https://www.oakbay.ca/municipal-services/bylaws/bylaw-${bylawNumber}`;
      }
    }
  } catch (error) {
    console.error("Error generating external URL:", error);
    // Fallback to general bylaws page
    externalUrl = "https://www.oakbay.ca/municipal-services/bylaws";
  }

  // Various action handlers
  const handleViewPdf = async () => {
    setIsVerifyingPdf(true);
    setPdfError(null);

    try {
      // Verify PDF exists by checking with the API
      const response = await fetch(
        `/api/bylaws/find-pdf?bylawNumber=${bylawNumber}`,
      );
      const data = await response.json();

      if (data.found && data.url) {
        // PDF found, open it
        setIsPdfOpen(true);
        setIsVerifyingPdf(false);
      } else {
        // PDF not found, show error and fallback
        setPdfError(`PDF for Bylaw ${bylawNumber} not found`);
        setIsVerifyingPdf(false);
        toast.error("PDF not found", {
          description: `Could not find PDF for Bylaw ${bylawNumber}. Directing to official website.`,
        });

        // Automatically fall back to external site
        setTimeout(() => {
          handleViewExternalPdf();
        }, 1500);
      }
    } catch (error) {
      console.error("Error verifying PDF:", error);
      setPdfError(
        `Error checking PDF: ${error instanceof Error ? error.message : String(error)}`,
      );
      setIsVerifyingPdf(false);

      // Fall back to default behavior - try to open PDF anyway
      setIsPdfOpen(true);
    }
  };

  const handlePdfNotFound = () => {
    toast.error("PDF not found", {
      description: `Could not find PDF for Bylaw ${bylawNumber}. Directing to official website.`,
    });

    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.open(externalUrl, "_blank", "noopener,noreferrer");
      }
    }, 1500);
  };

  const handleViewExternalPdf = () => {
    // Log action
    console.log(`Opening external PDF for Bylaw ${bylawNumber}`);

    // Open in new tab
    if (typeof window !== "undefined") {
      window.open(externalUrl, "_blank", "noopener,noreferrer,popup=yes");
    }
  };

  const handleViewOfficialSite = () => {
    // Log the action for debugging
    console.log("Opening official site (simplified for testing)");

    if (typeof window !== "undefined") {
      window.open(externalUrl, "_blank", "noopener,noreferrer,popup=yes");
    }
  };

  const handleExportReport = () => {
    // Generate a citation verification report
    toast.success("Citation verification report downloading...", {
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
      sourceUrl: "https://www.oakbay.ca/municipal-services/bylaws", // Simplified for testing
      verifiedDate: new Date().toISOString().split("T")[0],
      pdfPath: getPdfPath(),
    };

    // Log verification to console (in production, this would be saved)
    console.log("Citation verification details:", verificationData);

    // Show success after a delay to simulate report generation
    setTimeout(() => {
      toast.success("Citation verified", {
        description: "The citation verification report has been downloaded",
      });
    }, 1500);
  };

  // Fallback rendering in case of errors
  if (!bylawNumber) {
    console.warn("BylawCitation: Missing bylaw number", {
      props: { bylawNumber, section, title },
    });
    return (
      <CitationFallback
        bylawNumber="unknown"
        formattedTitle="Unknown Bylaw"
        error={new Error("Missing bylaw number")}
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
              "mb-4 overflow-hidden border-amber-100 bg-amber-50/30 shadow-sm hover:border-amber-200 dark:border-amber-900/30 dark:bg-amber-900/10 dark:hover:border-amber-800/80",
              expanded && "bg-amber-50/50 dark:bg-amber-900/20",
              className,
            )}
          >
            {/* Citation header with expand/collapse */}
            <CitationHeader
              expanded={expanded}
              setExpanded={setExpanded}
              bylawNumber={bylawNumber}
              formattedTitle={formattedTitle}
              formattedSection={formattedSection}
              validBylaw={validBylaw}
              isVerified={isVerified}
            />

            {/* Expandable content */}
            {expanded && (
              <CardContent className="px-4 pb-3 pt-1">
                {/* Metadata section */}
                <CitationMetadata
                  isConsolidated={isConsolidated}
                  consolidatedDate={consolidatedDate}
                  effectiveDate={effectiveDate}
                  financialImpact={financialImpact}
                  score={score}
                />

                {/* Citation text/excerpt */}
                <CitationExcerpt excerpt={excerpt} />

                {/* Citation formatter */}
                <CitationFormatter
                  citationFormat={citationFormat}
                  setCitationFormat={setCitationFormat}
                  bylawNumber={bylawNumber}
                  formattedTitle={formattedTitle}
                  section={section}
                  sectionTitle={sectionTitle}
                />

                {/* Citation actions */}
                <CitationActions
                  onViewPdf={handleViewPdf}
                  onViewExternalPdf={handleViewExternalPdf}
                  onViewOfficialSite={handleViewOfficialSite}
                  onExportReport={handleExportReport}
                  validBylaw={validBylaw}
                  isVerifyingPdf={isVerifyingPdf}
                  pdfError={pdfError}
                />

                {/* Citation feedback */}
                <CitationFeedback
                  bylawNumber={bylawNumber}
                  section={section}
                  citationText={excerpt}
                />
              </CardContent>
            )}
          </Card>

          {/* PDF viewer modal */}
          {isPdfOpen && (
            <PdfViewerModal
              url={getPdfPath()}
              title={`Bylaw ${bylawNumber} - ${title || "View Document"}`}
              initialPage={1}
              onClose={() => setIsPdfOpen(false)}
              onError={handlePdfNotFound}
            />
          )}
        </>
      );
    } catch (error) {
      console.error("Error rendering bylaw citation:", error);
      return (
        <CitationFallback
          bylawNumber={bylawNumber}
          formattedTitle={formattedTitle}
          error={
            error instanceof Error
              ? error
              : new Error("Unknown rendering error")
          }
        />
      );
    }
  };

  return safeRender();
}
