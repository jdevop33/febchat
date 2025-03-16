'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bylawNumber: string;
  title: string;
}

export function PdfViewerModal({
  isOpen,
  onClose,
  bylawNumber,
  title,
}: PdfViewerModalProps) {
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

  const pdfPath = getPdfPath(bylawNumber);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-4xl h-[80vh] p-0">
        <AlertDialogHeader className="px-4 py-2 flex flex-row items-center justify-between">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </AlertDialogHeader>
        <div className="size-full p-0 flex-1">
          <iframe
            src={pdfPath}
            className="w-full h-[calc(80vh-60px)]"
            title={`Bylaw ${bylawNumber}`}
          />
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}