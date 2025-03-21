'use client';

import React from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';

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
  section,
  isVerified = false,
}: PdfViewerModalProps) {
  // Simple handler to open external site
  const handleExternalOpen = () => {
    if (typeof window !== 'undefined') {
      // Open a generic URL
      window.open('https://www.oakbay.ca/municipal-services/bylaws', '_blank', 'noopener,noreferrer');
      
      toast.info('Opening external bylaw site', {
        description: `Opening external site for Bylaw ${bylawNumber}`,
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md p-6">
        <AlertDialogHeader className="flex flex-row items-center justify-between pb-4">
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
              Bylaw No. {bylawNumber}
              {section && ` - Section ${section}`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </AlertDialogHeader>

        <div className="flex h-40 flex-col items-center justify-center space-y-4 rounded-md bg-gray-50 p-6 dark:bg-gray-800">
          <p className="text-center text-sm text-muted-foreground">
            PDF viewer is currently disabled for testing purposes.
            <br />
            Please visit the official website to view this bylaw.
          </p>
          <Button variant="default" onClick={handleExternalOpen}>
            <ExternalLink size={16} className="mr-2" />
            Visit Official Website
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}