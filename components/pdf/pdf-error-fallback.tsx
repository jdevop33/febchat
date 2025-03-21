'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getExternalPdfUrl } from '@/lib/utils/bylaw-shared';

interface PdfErrorFallbackProps {
  bylawNumber: string;
  title?: string;
  className?: string;
  onRetry?: () => void;
  error?: Error | null;
}

/**
 * Error fallback component for PDF viewing issues
 */
export function PdfErrorFallback({
  bylawNumber,
  title,
  className = '',
  onRetry,
  error
}: PdfErrorFallbackProps) {
  const formattedTitle = title || `Bylaw No. ${bylawNumber}`;
  
  // Get external URL for redirect
  const externalUrl = getExternalPdfUrl(bylawNumber, title);
  
  // Handle opening external URL
  const handleExternalLink = () => {
    // Log the external URL for debugging
    console.log('Opening official URL:', externalUrl);
    
    // Open in new tab
    if (typeof window !== 'undefined') {
      window.open(externalUrl, '_blank', 'noopener,noreferrer,popup=yes');
    }
    
    // Show toast message
    toast.info('Opening official document', {
      description: `Redirecting to the official Oak Bay website for Bylaw ${bylawNumber}`
    });
  };
  
  return (
    <div className={`flex flex-col items-center justify-center p-4 text-center ${className}`}>
      <AlertTriangle className="mb-2 size-10 text-amber-500" />
      
      <p className="mb-2 text-muted-foreground">
        {error ? 
          `Error loading PDF: ${error.message}` : 
          `Unable to display PDF for ${formattedTitle}`
        }
      </p>
      
      <div className="flex gap-2">
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
          >
            Try Again
          </Button>
        )}
        
        <Button
          variant="default"
          onClick={handleExternalLink}
        >
          <ExternalLink size={16} className="mr-2" />
          View on Official Website
        </Button>
      </div>
    </div>
  );
}