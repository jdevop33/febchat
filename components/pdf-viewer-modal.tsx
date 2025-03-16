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
  AlertTriangle
} from 'lucide-react';

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

  // Function to map bylaw number to PDF filename
  const getPdfPath = (bylawNumber: string): string => {
    // Map of known bylaw numbers to their filenames
    const bylawMap: Record<string, string> = {
      '3152': '/pdfs/3152.pdf',
      '3210': '/pdfs/3210 -  Anti-Noise Bylaw - Consolidated to 4594.pdf',
      '3370': '/pdfs/3370, Water Rate Bylaw, 1981 (CONSOLIDATED)_2.pdf',
      '3416': '/pdfs/3416-Boulevard-Frontage-Tax-BL-1982-CONSOLIDATED-to-May-8-2023.pdf',
      '3531': '/pdfs/3531_ZoningBylawConsolidation_Aug302024.pdf',
      '3536': '/pdfs/3536.pdf',
      '3540': '/pdfs/3540, Parking Facilities BL 1986 (CONSOLIDATED)_1.pdf',
      '3545': '/pdfs/3545-Uplands-Bylaw-1987-(CONSOLIDATED-to-February-10-2020).pdf',
      '3550': '/pdfs/3550, Driveway Access BL (CONSOLIDATED).pdf',
      '3578': '/pdfs/3578_Subdivision-and-Development_CONSOLIDATED-to-September-2023.pdf',
      '3603': '/pdfs/3603, Business Licence Bylaw 1988 - CONSOLIDATED FIN.pdf',
      '3805': '/pdfs/3805.pdf',
      '3827': '/pdfs/3827, Records Administration BL 94 (CONSOLIDATED 2).pdf',
      '3829': '/pdfs/3829.pdf',
      '3832': '/pdfs/3832.pdf',
      '3891': '/pdfs/3891-Public-Sewer-Bylaw,-1996-CONSOLIDATED.pdf',
      '3938': '/pdfs/3938.pdf',
      '3946': '/pdfs/3946 Sign Bylaw 1997 (CONSOLIDATED) to Sept 11 2023_0.pdf',
      '3952': '/pdfs/3952, Ticket Information Utilization BL 97 (CONSOLIDATED)_2.pdf',
      '4008': '/pdfs/4008.pdf',
      '4013': '/pdfs/4013, Animal Control Bylaw, 1999 (CONSOLIDATED)_1.pdf',
      '4100': '/pdfs/4100-Streets-Traffic-Bylaw-2000.pdf',
      '4144': '/pdfs/4144, Oil Burning Equipment and Fuel Tank Regulation Bylaw, 2002.pdf',
      '4183': '/pdfs/4183_Board-of-Variance-Bylaw_CONSOLIDATED-to-Sept11-2023.pdf',
      '4222': '/pdfs/4222.pdf',
      '4239': '/pdfs/4239, Administrative Procedures Bylaw, 2004, (CONSOLIDATED).pdf',
      '4247': '/pdfs/4247 Building and Plumbing Bylaw 2005 Consolidated to September 11 2023_0.pdf',
      '4284': '/pdfs/4284, Elections and Voting (CONSOLIDATED).pdf',
      '4371': '/pdfs/4371-Refuse-Collection-and-Disposal-Bylaw-2007-(CONSOLIDATED).pdf',
      '4375': '/pdfs/4375.pdf',
      '4392': '/pdfs/4392, Sewer User Charge Bylaw 2008 (CONSOLIDATED).pdf',
      '4421': '/pdfs/4421.pdf',
      '4518': '/pdfs/4518.pdf',
      '4620': '/pdfs/4620, Oak Bay Official Community Plan Bylaw, 2014.pdf',
      '4671': '/pdfs/4671, Sign Bylaw Amendment Bylaw No. 4671, 2017.pdf',
      '4672': '/pdfs/4672-Parks-and-Beaches-Bylaw-2017-CONSOLIDATED.pdf',
      '4719': '/pdfs/4719, Fire Prevention and Life Safety Bylaw, 2018.pdf',
      '4720': '/pdfs/4720.pdf',
      '4740': '/pdfs/4740 Council Procedure Bylaw CONSOLIDATED 4740.003.pdf',
      '4742': '/pdfs/4742-Tree-Protection-Bylaw-2020-CONSOLIDATED.pdf',
      '4747': '/pdfs/4747, Reserve Funds Bylaw, 2020 CONSOLIDATED.pdf',
      '4770': '/pdfs/4770 Heritage Commission Bylaw CONSOLIDATED 4770.001.pdf',
      '4771': '/pdfs/4771 Advisory Planning Commission Bylaw CONSOLIDATED 4771.001.pdf',
      '4772': '/pdfs/4772 Advisory Planning Commission Bylaw CONSOLIDATED 4772.001.pdf',
      '4777': '/pdfs/4777 PRC Fees and Charges Bylaw CONSOLIDATED.pdf',
      '4822': '/pdfs/4822 Council Remuneration Bylaw - DRAFT.pdf',
      '4844': '/pdfs/4844-Consolidated-up to-4858.pdf',
      '4845': '/pdfs/4845-Planning-and-Development-Fees-and-Charges-CONSOLIDATED.pdf',
      '4849': '/pdfs/4849-Property-Tax-Exemption-Bylaw-No-4849-2023.pdf',
      '4879': '/pdfs/4879, Oak Bay Business Improvement Area Bylaw, 2024.pdf',
      '4892': '/pdfs/Amenity Cost Charge Bylaw No. 4892, 2024.pdf',
      '4866': '/pdfs/Boulevard Frontage Tax Amendment Bylaw No. 4866, 2024.pdf',
      '4891': '/pdfs/Development Cost Charge Bylaw No. 4891, 2024.pdf',
      '4861': '/pdfs/Tax Rates Bylaw 2024, No. 4861.pdf',
      // Add more mappings as needed
    };
    
    // Check if we have a direct mapping
    if (bylawMap[bylawNumber]) {
      return bylawMap[bylawNumber];
    }
    
    // If no direct mapping, look for a generic file with the number
    return `/pdfs/${bylawNumber}.pdf`;
  };

  useEffect(() => {
    if (isOpen && bylawNumber) {
      setLoading(true);
      
      // Use the provided PDF path or fall back to our mapping
      setPdfUrl(pdfPath || getPdfPath(bylawNumber));
      
      // Simulate PDF loading and page count detection
      // In a real implementation, you would use PDF.js to get the actual page count
      setTimeout(() => {
        // Random page count between 5 and 50 for demo
        setTotalPages(Math.floor(Math.random() * 45) + 5);
        setLoading(false);
      }, 1000);
    }
  }, [isOpen, bylawNumber, pdfPath]);

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
  };

  // Create direct PDF viewer URL with parameters
  // Add section parameter if we're looking up a specific section
  const viewerUrl = `${pdfUrl}#page=${currentPage}&zoom=${scale * 100}`;
  
  // Track PDF load errors
  const [loadError, setLoadError] = useState(false);
  
  // Handle iframe load error
  const handleIframeError = () => {
    setLoadError(true);
    setLoading(false);
    toast.error('Error loading PDF', {
      description: `We couldn't load the PDF for Bylaw No. ${bylawNumber}. You can try the external link instead.`
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-4xl h-[90vh] p-0">
        <AlertDialogHeader className="px-4 py-2 flex flex-row items-center justify-between border-b">
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
        
        <div className="flex items-center justify-between px-4 py-2 border-b">
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
              <span className="text-sm mr-1">Page</span>
              <input 
                type="number" 
                value={currentPage}
                min={1}
                max={totalPages}
                disabled={loading}
                className="w-12 text-center border rounded px-1 py-0.5 text-sm"
                onChange={(e) => handlePageChange(Number.parseInt(e.target.value) || 1)}
              />
              <span className="text-sm ml-1">of {totalPages}</span>
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
            <span className="text-sm w-16 text-center">
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
                className="pl-7 pr-2 py-1 border rounded text-sm w-32"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={loading}
              />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
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
              onClick={() => window.open(`https://oakbay.civicweb.net/document/bylaw/${bylawNumber}`, '_blank')}
              disabled={loading}
            >
              <ExternalLink size={16} className="mr-1" />
              <span className="hidden sm:inline">View Online</span>
            </Button>
          </div>
        </div>
        
        <div className="size-full p-0 flex-1 bg-gray-100 dark:bg-gray-800">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="size-10 animate-spin text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Loading PDF...</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center h-full">
              <AlertTriangle className="size-10 text-amber-500 mb-2" />
              <p className="text-muted-foreground mb-2">Unable to load PDF</p>
              <Button 
                variant="default"
                onClick={() => window.open(`https://oakbay.civicweb.net/document/bylaw/${bylawNumber}`, '_blank')}
              >
                <ExternalLink size={16} className="mr-2" />
                View on Official Website
              </Button>
            </div>
          ) : (
            <iframe
              src={viewerUrl}
              className="w-full h-[calc(90vh-110px)]"
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