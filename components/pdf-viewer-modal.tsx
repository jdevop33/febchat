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
import {
  getExternalPdfUrl,
  getBestPdfUrl,
  findSectionPage,
  getEstimatedPageCount,
} from '@/lib/utils/bylaw-utils';

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
                  window.open(pdfUrl, '_blank', 'noopener,noreferrer');
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
                if (typeof window !== 'undefined') {
                  window.open(getExternalPdfUrl(bylawNumber, title), '_blank');
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
                  if (typeof window !== 'undefined') {
                    window.open(getExternalPdfUrl(bylawNumber, title), '_blank');
                  }
                }}
              >
                <ExternalLink size={16} className="mr-2" />
                View on Official Website
              </Button>
            </div>
          ) : (
            <iframe
              src={viewerUrl}
              className="h-[calc(90vh-110px)] w-full"
              title={`Bylaw ${bylawNumber}`}
              onError={handleIframeError}
              onLoad={() => setLoading(false)}
              sandbox="allow-same-origin allow-scripts allow-forms"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
