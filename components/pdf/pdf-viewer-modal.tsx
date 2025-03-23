'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { X, ExternalLink, FileText, AlertTriangle, ChevronLeft, ChevronRight, Download, Maximize2 } from 'lucide-react';

interface PdfViewerModalProps {
  onClose: () => void;
  title: string;
  initialPage?: number;
  url?: string;
  onError?: () => void;
  externalUrl?: string;
}

export function PdfViewerModal({
  onClose,
  title,
  initialPage = 1,
  url,
  onError,
  externalUrl,
}: PdfViewerModalProps) {
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  
  // Check if the PDF exists on component mount
  useEffect(() => {
    if (!url) {
      setPdfError('No PDF URL provided');
      if (onError) onError();
      return;
    }

    // Verify PDF can be loaded
    const checkPdf = async () => {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
          console.error(`PDF not found: ${url}`);
          setPdfError(`PDF not found (status: ${response.status})`);
          if (onError) onError();
        } else {
          setIsPdfLoading(false);
        }
      } catch (error) {
        console.error('Error checking PDF:', error);
        if (retryCount < 2) {
          console.log(`Retrying PDF load (attempt ${retryCount + 1})...`);
          setRetryCount(prev => prev + 1);
          setTimeout(checkPdf, 1000); // Retry after 1 second
        } else {
          setPdfError(`Failed to load PDF: ${error instanceof Error ? error.message : String(error)}`);
          if (onError) onError();
        }
      }
    };
    
    checkPdf();
  }, [url, onError, retryCount]);

  // Handle PDF load events
  const handlePdfLoad = () => {
    setIsPdfLoading(false);
    
    // Try to get total pages from the iframe
    try {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        // Listen for messages from the PDF viewer
        window.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'pdf-total-pages') {
            setTotalPages(event.data.pages);
          }
        });
        
        // Request total pages count (this would work if PDF.js is properly set up)
        iframe.contentWindow.postMessage({ type: 'get-total-pages' }, '*');
      }
    } catch (e) {
      console.warn('Could not get PDF page count:', e);
      // Set a reasonable default
      setTotalPages(20);
    }
  };

  // Navigate between pages
  const goToPage = (page: number) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    
    setCurrentPage(page);
    
    // Update iframe src to navigate to specific page
    try {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = `${url}#page=${page}`;
      }
    } catch (e) {
      console.error('Error navigating to page:', e);
    }
  };

  // Simple handler to open external site
  const handleExternalOpen = () => {
    if (typeof window !== 'undefined') {
      // Use provided external URL or default to bylaws page
      const urlToOpen =
        externalUrl ||
        'https://www.oakbay.ca/municipal-services/bylaws';

      window.open(urlToOpen, '_blank', 'noopener,noreferrer');

      toast.info('Opening external bylaw site', {
        description: 'Opening external site for bylaw information',
      });
    }
  };
  
  // Handle download action
  const handleDownload = () => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Downloading PDF', {
        description: `Downloading ${title}`,
      });
    }
  };

  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-5xl p-6">
        <AlertDialogHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <AlertDialogTitle className="flex items-center text-lg">
              {title}
            </AlertDialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </AlertDialogHeader>

        {isPdfLoading && !pdfError ? (
          <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading PDF document...</p>
            <p className="text-xs text-muted-foreground">This may take a moment for large documents</p>
          </div>
        ) : pdfError ? (
          <div className="flex h-[70vh] flex-col items-center justify-center space-y-6 rounded-md bg-gray-50 p-6 dark:bg-gray-800">
            <AlertTriangle size={48} className="text-amber-500" />
            <div className="text-center">
              <p className="mb-2 text-lg font-medium text-amber-700 dark:text-amber-300">
                PDF Not Available
              </p>
              <p className="text-center text-sm text-muted-foreground">
                {pdfError}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="default"
                onClick={handleExternalOpen}
                className="mt-4"
              >
                <ExternalLink size={16} className="mr-2" />
                View on Official Website
              </Button>
              {retryCount < 3 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setPdfError(null);
                    setIsPdfLoading(true);
                    setRetryCount(0);
                  }}
                  className="mt-4"
                >
                  <ChevronRight size={16} className="mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="relative h-[70vh]">
              <iframe
                src={`${url}#page=${currentPage}`}
                title={title}
                className="h-full w-full rounded-md border border-gray-200 bg-white dark:border-gray-700"
                sandbox="allow-scripts allow-same-origin"
                onLoad={handlePdfLoad}
                onError={() => {
                  setPdfError('Failed to load PDF in viewer');
                  if (onError) onError();
                }}
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(url, '_blank')}
                >
                  <Maximize2 size={16} className="mr-2" />
                  Open Full PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExternalOpen}
                >
                  <ExternalLink size={16} className="mr-2" />
                  Official Website
                </Button>
              </div>
            </div>
            
            {/* PDF navigation controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleDownload}
              >
                <Download size={16} className="mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}
        
        <div className="mt-4 text-center text-xs text-muted-foreground">
          © Oak Bay Municipal Government. All documents are property of the District of Oak Bay.
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
