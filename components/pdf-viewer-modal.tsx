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

  // Function to get external PDF URL for bylaw (municipal website link)
  const getExternalPdfUrl = (bylawNumber: string, title?: string): string => {
    // Special case for known bylaws with specific URLs
    const knownBylawUrls: Record<string, string> = {
      '3210': 'https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/3210.pdf',
      '4892': 'https://www.oakbay.ca/wp-content/uploads/2025/02/4892-Amenity-Cost-Charge-Bylaw.pdf',
    };
    
    if (knownBylawUrls[bylawNumber]) {
      return knownBylawUrls[bylawNumber];
    }
    
    // Determine URL pattern based on bylaw number
    const bylawNum = parseInt(bylawNumber, 10);
    
    if (isNaN(bylawNum)) {
      // Fallback to main bylaws page if not a valid number
      return 'https://www.oakbay.ca/council-administration/bylaws-policies/oak-bay-municipal-bylaws/';
    }
    
    if (bylawNum < 4000) {
      // Older bylaws pattern
      return `https://www.oakbay.ca/sites/default/files/municipal-services/bylaws/${bylawNumber}.pdf`;
    } else {
      // Newer bylaws pattern - note the URL might vary based on the actual upload date
      // We'd need a more complete database to know exact month/year for each bylaw
      const currentYear = new Date().getFullYear();
      const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
      
      // Format title for URL if available
      const formattedTitle = title 
        ? `-${title.replace(/\s+/g, '-')}` 
        : '';
      
      return `https://www.oakbay.ca/wp-content/uploads/${currentYear}/${currentMonth}/${bylawNumber}${formattedTitle}.pdf`;
    }
  };

  // Function to map bylaw number to PDF filename (local files)
  const getPdfPath = (bylawNumber: string): string => {
    // Map of known bylaw numbers to their filenames in our local system
    const bylawMap: Record<string, string> = {
      '3152': '/pdfs/3152.pdf',
      '3210': '/pdfs/3210 -  Anti-Noise Bylaw - Consolidated to 4594.pdf',
      '3370': '/pdfs/3370, Water Rate Bylaw, 1981 (CONSOLIDATED)_2.pdf',
      '3416':
        '/pdfs/3416-Boulevard-Frontage-Tax-BL-1982-CONSOLIDATED-to-May-8-2023.pdf',
      '3531': '/pdfs/3531_ZoningBylawConsolidation_Aug302024.pdf',
      '3536': '/pdfs/3536.pdf',
      '3540': '/pdfs/3540, Parking Facilities BL 1986 (CONSOLIDATED)_1.pdf',
      '3545':
        '/pdfs/3545-Uplands-Bylaw-1987-(CONSOLIDATED-to-February-10-2020).pdf',
      '3550': '/pdfs/3550, Driveway Access BL (CONSOLIDATED).pdf',
      '3578':
        '/pdfs/3578_Subdivision-and-Development_CONSOLIDATED-to-September-2023.pdf',
      '3603': '/pdfs/3603, Business Licence Bylaw 1988 - CONSOLIDATED FIN.pdf',
      '3805': '/pdfs/3805.pdf',
      '3827': '/pdfs/3827, Records Administration BL 94 (CONSOLIDATED 2).pdf',
      '3829': '/pdfs/3829.pdf',
      '3832': '/pdfs/3832.pdf',
      '3891': '/pdfs/3891-Public-Sewer-Bylaw,-1996-CONSOLIDATED.pdf',
      '3938': '/pdfs/3938.pdf',
      '3946': '/pdfs/3946 Sign Bylaw 1997 (CONSOLIDATED) to Sept 11 2023_0.pdf',
      '3952':
        '/pdfs/3952, Ticket Information Utilization BL 97 (CONSOLIDATED)_2.pdf',
      '4008': '/pdfs/4008.pdf',
      '4013': '/pdfs/4013, Animal Control Bylaw, 1999 (CONSOLIDATED)_1.pdf',
      '4100': '/pdfs/4100-Streets-Traffic-Bylaw-2000.pdf',
      '4144':
        '/pdfs/4144, Oil Burning Equipment and Fuel Tank Regulation Bylaw, 2002.pdf',
      '4183':
        '/pdfs/4183_Board-of-Variance-Bylaw_CONSOLIDATED-to-Sept11-2023.pdf',
      '4222': '/pdfs/4222.pdf',
      '4239': '/pdfs/4239, Administrative Procedures Bylaw, 2004, (CONSOLIDATED).pdf',
      '4247':
        '/pdfs/4247 Building and Plumbing Bylaw 2005 Consolidated to September 11 2023_0.pdf',
      '4284': '/pdfs/4284, Elections and Voting (CONSOLIDATED).pdf',
      '4371':
        '/pdfs/4371-Refuse-Collection-and-Disposal-Bylaw-2007-(CONSOLIDATED).pdf',
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
      '4771':
        '/pdfs/4771 Advisory Planning Commission Bylaw CONSOLIDATED 4771.001.pdf',
      '4772':
        '/pdfs/4772 Advisory Planning Commission Bylaw CONSOLIDATED 4772.001.pdf',
      '4777': '/pdfs/4777 PRC Fees and Charges Bylaw CONSOLIDATED.pdf',
      '4822': '/pdfs/4822 Council Remuneration Bylaw - DRAFT.pdf',
      '4844': '/pdfs/4844-Consolidated-up to-4858.pdf',
      '4845':
        '/pdfs/4845-Planning-and-Development-Fees-and-Charges-CONSOLIDATED.pdf',
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
  
  // Function to find specific section in PDF and return page number
  const findSectionInPdf = async (pdfPath: string, section: string): Promise<number | null> => {
    // This would normally use PDF.js to search through the PDF content
    // For this implementation, we'll use a simpler approach with known section page mappings
    const sectionPageMap: Record<string, Record<string, number>> = {
      // Anti-Noise Bylaw example mappings
      '3210': {
        '3': 2, // Section 3 is on page 2
        '4': 3, // Section 4 is on page 3
        '5': 4, // etc.
        '5(7)(a)': 5,
        '5(7)(b)': 5,
        '4(5)(a)': 3,
        '4(5)(b)': 3
      },
      '3531': {
        '1': 1,
        '2': 2,
        '3': 3
      }
    };
    
    // Normalize section format for lookup
    const normalizedSection = section.replace(/^(section|part|schedule)\s+/i, '');
    
    // If we have mappings for this bylaw and section, return the page number
    if (sectionPageMap[bylawNumber] && sectionPageMap[bylawNumber][normalizedSection]) {
      return sectionPageMap[bylawNumber][normalizedSection];
    }
    
    // If no mapping is found, return null (default to page 1)
    return null;
  };

  useEffect(() => {
    if (isOpen && bylawNumber) {
      setLoading(true);

      // Check if we should use external PDF directly 
      // This is a significant improvement for PDF rendering - use the actual external source
      const useExternalPdf = true; // Set to true to use direct links to municipal website PDFs
      
      // Determine PDF URL based on setting
      const resolvedPdfPath = useExternalPdf 
        ? getExternalPdfUrl(bylawNumber, title)
        : (pdfPath || getPdfPath(bylawNumber));
        
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
          // Find the specific section page if available
          if (section) {
            const sectionPage = await findSectionInPdf(resolvedPdfPath, section);
            if (sectionPage) {
              setCurrentPage(sectionPage);
            }
          }
          
          // Set a more realistic page count based on bylaw number
          // Different bylaws have different lengths
          let pageCount = 20; // default
          
          // Set specific page counts for known bylaws
          const bylawPageCounts: Record<string, number> = {
            '3210': 12,  // Anti-Noise Bylaw
            '3531': 150, // Zoning Bylaw (typically very long)
            '4742': 45,  // Tree Protection Bylaw
            '4100': 30,  // Streets & Traffic Bylaw
          };
          
          if (bylawPageCounts[bylawNumber]) {
            pageCount = bylawPageCounts[bylawNumber];
          } else {
            // For unknown bylaws, base count on bylaw number (newer bylaws tend to be longer)
            const numericBylawNum = parseInt(bylawNumber, 10);
            if (!isNaN(numericBylawNum)) {
              if (numericBylawNum < 4000) pageCount = 10 + (numericBylawNum % 10);
              else if (numericBylawNum < 4500) pageCount = 20 + (numericBylawNum % 15);
              else pageCount = 25 + (numericBylawNum % 20);
            }
          }
          
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
              onClick={() =>
                window.open(pdfUrl, '_blank', 'noopener,noreferrer')
              }
              disabled={loading}
            >
              <ExternalLink size={16} className="mr-1" />
              <span className="hidden sm:inline">Open in New Tab</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  getExternalPdfUrl(bylawNumber, title),
                  '_blank',
                )
              }
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
                onClick={() =>
                  window.open(
                    getExternalPdfUrl(bylawNumber, title),
                    '_blank',
                  )
                }
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
