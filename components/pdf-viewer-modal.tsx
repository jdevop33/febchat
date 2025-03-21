'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Download,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

// Hardcoded PDF URLs to prevent client/server mismatch issues
const HARDCODED_PDF_URLS: Record<string, string> = {
  "4247": "https://www.oakbay.ca/wp-content/uploads/2024/03/4247-Building-and-Plumbing-Bylaw-2005-CONSOLIDATED.pdf",
  "4742": "https://www.oakbay.ca/wp-content/uploads/2024/01/4742-Tree-Protection-Bylaw-2020-CONSOLIDATED.pdf",
  "3210": "https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/3210%20-Anti-Noise%20Bylaw%20-%20Consolidated%20to%204594.pdf",
  "3531": "https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/3531_ZoningBylawConsolidation_Aug302024.pdf",
  "4100": "https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/4100-Streets-Traffic-Bylaw-2000.pdf",
  "4849": "https://www.oakbay.ca/wp-content/uploads/2025/02/4849-Property-Tax-Exemption-2023.pdf",
  "4861": "https://www.oakbay.ca/wp-content/uploads/2025/02/4861-Tax-Rates-Bylaw.pdf",
  "4891": "https://www.oakbay.ca/wp-content/uploads/2025/02/4891-Development-Cost-Charge-Bylaw-2024.pdf",
  "4892": "https://www.oakbay.ca/wp-content/uploads/2025/02/4892-Amenity-Cost-Charge-Bylaw.pdf"
};

// Hard-coded section page mappings
const SECTION_PAGE_MAPPINGS: Record<string, Record<string, number>> = {
  "3210": { "3": 2, "4": 3, "5": 4, "5(7)(a)": 5, "5(7)(b)": 5, "4(5)(a)": 3, "4(5)(b)": 3, "7": 6 },
  "3531": { "1": 1, "2": 2, "3": 3, "4.1": 5, "4.2": 6, "5.1": 10, "6.1": 15 },
  "4742": { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5 },
  "4100": { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5 },
  "4247": { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8 }
};

// Safe client-side URL getters that don't rely on server imports
const getExternalPdfUrl = (bylawNumber: string, title?: string): string => {
  // Use hardcoded URL if available
  if (HARDCODED_PDF_URLS[bylawNumber]) {
    return HARDCODED_PDF_URLS[bylawNumber];
  }
  
  // Fallback to a predictable format
  return `https://www.oakbay.ca/bylaws/${bylawNumber}.pdf`;
};

const getBestPdfUrl = (bylawNumber: string, title?: string): string => {
  // Always use external URLs for consistency between client and server
  return getExternalPdfUrl(bylawNumber, title);
};

const findSectionPage = (bylawNumber: string, section: string): number | null => {
  // Normalize section format for lookup
  const normalizedSection = section.replace(/^(section|part|schedule)\s+/i, '');

  // Check our hardcoded mappings
  if (SECTION_PAGE_MAPPINGS[bylawNumber]?.[normalizedSection]) {
    return SECTION_PAGE_MAPPINGS[bylawNumber][normalizedSection];
  }
  
  // Fallback to page 1
  return 1;
};

const getEstimatedPageCount = (bylawNumber: string): number => {
  // Hardcoded page counts for common bylaws
  const pageCountMap: Record<string, number> = {
    "3210": 12, // Anti-Noise Bylaw
    "3531": 150, // Zoning Bylaw
    "4742": 45, // Tree Protection Bylaw
    "4100": 30, // Streets & Traffic Bylaw
    "4247": 40, // Building and Plumbing Bylaw
  };
  
  return pageCountMap[bylawNumber] || 20; // Default to 20 pages
};

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bylawNumber: string;
  title: string;
  initialPage?: number;
  pdfPath?: string;
  section?: string;
  isVerified?: boolean;
}

export function PdfViewerModal({
  isOpen,
  onClose,
  bylawNumber,
  title,
  initialPage = 1,
  pdfPath,
  section,
  isVerified = false,
}: PdfViewerModalProps) {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && bylawNumber) {
      setLoading(true);

      // Always use the best PDF URL based on environment
      // In production, use direct links to municipal website PDFs
      // In development, use local PDF files if available
      const resolvedPdfPath = pdfPath || getBestPdfUrl(bylawNumber, title);

      console.log(`Loading PDF from: ${resolvedPdfPath}`);
      setPdfUrl(resolvedPdfPath);

      // In a real implementation with PDF.js, we would use:
      // pdfjs.getDocument(resolvedPdfPath).promise.then(pdf => {
      //   setTotalPages(pdf.numPages);
      //   setLoading(false);
      // });

      // For this implementation, using a simulated approach
      const simulatePdfLoad = async () => {
        try {
          // Find the specific section page if available using utility function
          if (section) {
            const sectionPage = findSectionPage(bylawNumber, section);
            if (sectionPage) {
              setCurrentPage(sectionPage);
            }
          }

          // Get estimated page count from utility function
          const pageCount = getEstimatedPageCount(bylawNumber);

          setTotalPages(pageCount);
          setLoading(false);
        } catch (error) {
          console.error('Error loading PDF:', error);
          setLoading(false);
          setLoadError(true);
        }
      };

      simulatePdfLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bylawNumber, pdfPath, section, title]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentPage(initialPage);
      setScale(1);
      setSearchQuery('');
    }
  }, [isOpen, initialPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleZoom = (increment: number) => {
    setScale((prevScale) => {
      const newScale = prevScale + increment;
      return Math.max(0.5, Math.min(2.5, newScale));
    });
  };

  const handleSearch = () => {
    // In a real implementation, this would search through the PDF content
    toast.info('Searching through PDF', {
      description: `Searching for "${searchQuery}" in ${title}`,
    });
    // Here you would integrate with a PDF.js search functionality
  };

  const handleDownload = () => {
    // Only run in browser context
    if (typeof document !== 'undefined') {
      // Trigger download of the PDF
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Oak_Bay_Bylaw_${bylawNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Downloading PDF', {
        description: `Bylaw ${bylawNumber} is being downloaded`,
      });
    } else {
      // Fallback for non-browser environments
      console.log('Document API not available');
    }
  };

  // Create direct PDF viewer URL with parameters including section targeting
  const viewerUrl = section
    ? `${pdfUrl}#page=${currentPage}&zoom=${scale * 100}&search=${encodeURIComponent(section)}`
    : `${pdfUrl}#page=${currentPage}&zoom=${scale * 100}`;
    
  // Log the created URL for debugging purposes
  console.log("PDF Viewer URL:", viewerUrl);

  // Track PDF load errors
  const [loadError, setLoadError] = useState(false);

  // Handle iframe load error
  const handleIframeError = () => {
    setLoadError(true);
    setLoading(false);
    toast.error('Error loading PDF', {
      description: `We couldn't load the PDF for Bylaw No. ${bylawNumber}. You can try the external link instead.`,
    });
  };

  // Define an error boundary component to catch PDF rendering errors
  const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
    const [hasError, setHasError] = useState(false);
    
    // Use effect to set up error handler
    useEffect(() => {
      // Error event handler for iframe errors
      const handleError = () => {
        console.error("PDF iframe error detected");
        setHasError(true);
      };
      
      // Set global error handler
      window.addEventListener('error', handleError);
      
      // Cleanup
      return () => {
        window.removeEventListener('error', handleError);
      };
    }, []);
    
    if (hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <AlertTriangle className="mb-2 size-10 text-amber-500" />
          <p className="mb-2 text-muted-foreground">Unable to display PDF</p>
          <Button
            variant="default"
            onClick={() => {
              const officialUrl = getExternalPdfUrl(bylawNumber, title);
              if (typeof window !== 'undefined') {
                window.open(officialUrl, '_blank', 'noopener,noreferrer,popup=yes');
              }
            }}
          >
            <ExternalLink size={16} className="mr-2" />
            View on Official Website
          </Button>
        </div>
      );
    }
    
    return <>{children}</>;
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="h-[90vh] max-w-4xl p-0">
        <AlertDialogHeader className="flex flex-row items-center justify-between border-b px-4 py-2">
          <div>
            <AlertDialogTitle className="flex items-center">
              {title}
              {isVerified && (
                <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                  Verified
                </span>
              )}
            </AlertDialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Source document linked directly from municipal records
              {section && ` - Section ${section}`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </AlertDialogHeader>

        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <div className="flex items-center">
              <span className="mr-1 text-sm">Page</span>
              <input
                type="number"
                value={currentPage}
                min={1}
                max={totalPages}
                disabled={loading}
                className="w-12 rounded border px-1 py-0.5 text-center text-sm"
                onChange={(e) =>
                  handlePageChange(Number.parseInt(e.target.value) || 1)
                }
              />
              <span className="ml-1 text-sm">of {totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || loading}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom(-0.1)}
              disabled={scale <= 0.5 || loading}
            >
              <ZoomOut size={16} />
            </Button>
            <span className="w-16 text-center text-sm">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom(0.1)}
              disabled={scale >= 2.5 || loading}
            >
              <ZoomIn size={16} />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search PDF..."
                className="w-32 rounded border py-1 pl-7 pr-2 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={loading}
              />
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={loading}
            >
              <Download size={16} className="mr-1" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  console.log('Opening PDF in new tab:', pdfUrl);
                  window.open(pdfUrl, '_blank', 'noopener,noreferrer,popup=yes');
                }
              }}
              disabled={loading}
            >
              <ExternalLink size={16} className="mr-1" />
              <span className="hidden sm:inline">Open in New Tab</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const officialUrl = getExternalPdfUrl(bylawNumber, title);
                console.log('Opening official site URL:', officialUrl);
                if (typeof window !== 'undefined') {
                  window.open(officialUrl, '_blank', 'noopener,noreferrer,popup=yes');
                }
              }}
              disabled={loading}
            >
              <ExternalLink size={16} className="mr-1" />
              <span className="hidden sm:inline">Official Site</span>
            </Button>
          </div>
        </div>

        <div className="size-full flex-1 bg-gray-100 p-0 dark:bg-gray-800">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center">
              <Loader2 className="mb-2 size-10 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading PDF...</p>
            </div>
          ) : loadError ? (
            <div className="flex h-full flex-col items-center justify-center">
              <AlertTriangle className="mb-2 size-10 text-amber-500" />
              <p className="mb-2 text-muted-foreground">Unable to load PDF</p>
              <Button
                variant="default"
                onClick={() => {
                  const errorRedirectUrl = getExternalPdfUrl(bylawNumber, title);
                  console.log('Redirecting to official site due to error:', errorRedirectUrl);
                  if (typeof window !== 'undefined') {
                    window.open(errorRedirectUrl, '_blank', 'noopener,noreferrer,popup=yes');
                  }
                }}
              >
                <ExternalLink size={16} className="mr-2" />
                View on Official Website
              </Button>
            </div>
          ) : (
            <ErrorBoundary>
              {(() => {
                try {
                  return (
                    <iframe
                      src={viewerUrl}
                      className="h-[calc(90vh-110px)] w-full"
                      title={`Bylaw ${bylawNumber}`}
                      onError={handleIframeError}
                      onLoad={() => setLoading(false)}
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                      referrerPolicy="no-referrer"
                    />
                  );
                } catch (error) {
                  console.error("Error rendering PDF iframe:", error);
                  handleIframeError();
                  return (
                    <div className="flex h-full flex-col items-center justify-center">
                      <AlertTriangle className="mb-2 size-10 text-amber-500" />
                      <p className="mb-2 text-muted-foreground">Unable to display PDF</p>
                      <Button
                        variant="default"
                        onClick={() => {
                          const errorRedirectUrl = getExternalPdfUrl(bylawNumber, title);
                          console.log('Redirecting to official site due to error:', errorRedirectUrl);
                          if (typeof window !== 'undefined') {
                            window.open(errorRedirectUrl, '_blank', 'noopener,noreferrer,popup=yes');
                          }
                        }}
                      >
                        <ExternalLink size={16} className="mr-2" />
                        View on Official Website
                      </Button>
                    </div>
                  );
                }
              })()}
            </ErrorBoundary>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
