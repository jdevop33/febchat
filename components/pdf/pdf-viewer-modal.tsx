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
import { X, ExternalLink, FileText, AlertTriangle } from 'lucide-react';

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
          setPdfError(`PDF not found (${response.status})`);
          if (onError) onError();
        } else {
          setIsPdfLoading(false);
        }
      } catch (error) {
        console.error('Error checking PDF:', error);
        setPdfError(`Failed to load PDF: ${error instanceof Error ? error.message : String(error)}`);
        if (onError) onError();
      }
    };
    
    checkPdf();
  }, [url, onError]);

  // Simple handler to open external site
  const handleExternalOpen = () => {
    if (typeof window !== 'undefined') {
      // Use provided external URL or default to bylaws page
      const urlToOpen =
        externalUrl ||
        `https://www.oakbay.ca/municipal-services/bylaws`;

      window.open(urlToOpen, '_blank', 'noopener,noreferrer');

      toast.info('Opening external bylaw site', {
        description: `Opening external site for bylaw information`,
      });
    }
  };

  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-4xl p-6">
        <AlertDialogHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <AlertDialogTitle className="flex items-center">
              {title}
            </AlertDialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </AlertDialogHeader>

        {isPdfLoading && !pdfError ? (
          <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading PDF...</p>
          </div>
        ) : pdfError ? (
          <div className="flex h-[60vh] flex-col items-center justify-center space-y-6 rounded-md bg-gray-50 p-6 dark:bg-gray-800">
            <AlertTriangle size={48} className="text-amber-500" />
            <div className="text-center">
              <p className="mb-2 text-lg font-medium text-amber-700 dark:text-amber-300">
                PDF Not Available
              </p>
              <p className="text-center text-sm text-muted-foreground">
                {pdfError}
              </p>
            </div>
            <Button
              variant="default"
              onClick={handleExternalOpen}
              className="mt-4"
            >
              <ExternalLink size={16} className="mr-2" />
              View on Official Website
            </Button>
          </div>
        ) : (
          <div className="relative h-[60vh]">
            <iframe
              src={`${url}#page=${initialPage}`}
              title={title}
              className="h-full w-full rounded-md border border-gray-200 bg-white dark:border-gray-700"
              sandbox="allow-scripts allow-same-origin"
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
                <FileText size={16} className="mr-2" />
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
        )}
        
        <div className="mt-4 text-center text-xs text-muted-foreground">
          © Oak Bay Municipal Government. All documents are property of the District of Oak Bay.
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
