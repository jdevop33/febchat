'use client';

import React from 'react';
import { Markdown } from '@/components/markdown';
import { BylawCitation } from '@/components/bylaw/bylaw-citation';
import { VALIDATED_BYLAWS } from '@/lib/utils/bylaw-utils';
import { bylawTitleMap } from '@/lib/utils/bylaw-maps';

interface EnhancedMarkdownProps {
  children: string;
  className?: string;
}

export function EnhancedMarkdown({ children, className }: EnhancedMarkdownProps) {
  // Regular expression to match bylaw references with number capture groups and optional section
  const bylawRegex = /(?:Oak Bay(?:'s)?|Municipal)?\s*(?:((?:Building and Plumbing|Tree Protection|Anti-Noise|Streets[- ]Traffic|Zoning|Parks and Beaches|Subdivision|Uplands|Refuse Collection|Board of Variance|Property Tax(?:\s+Exemption)?|Tax Rates|Development Cost Charge|Amenity Cost Charge|Sign|Animal Control)\s+Bylaw(?:\s*\(?(?:No\.?|Number)?\s*(\d{4})\)?)?)|(?:Bylaw(?:\s+(?:No\.?|Number)?)?\s*(\d{4})))(?:,?\s*(?:Section|Sec\.|§)\s*([\w\d\.\(\)]+))?/gi;
  
  // If no bylaw references or no content, just render as regular markdown
  if (!children || !bylawRegex.test(children)) {
    return <Markdown className={className}>{children}</Markdown>;
  }
  
  // Reset regex state
  bylawRegex.lastIndex = 0;
  
  // Process text and convert bylaw references to components
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  let key = 0;
  
  // eslint-disable-next-line no-cond-assign
  while (match = bylawRegex.exec(children)) {
    // Add text before match
    if (match.index > lastIndex) {
      segments.push(
        <Markdown key={`text-${key++}`} className={className}>
          {children.substring(lastIndex, match.index)}
        </Markdown>
      );
    }
    
    // Extract bylaw info
    const fullMatch = match[0];
    const bylawName = match[1];
    const bylawNumber = match[2] || match[3] || (bylawName ? getBylawNumberFromName(bylawName) : null);
    const section = match[4] || "1"; // Get section if available, default to 1
    
    // Get a title for the bylaw using centralized mapping
    let title = bylawName;
    if (!title && bylawNumber) {
      // Get title from centralized bylaw map
      title = bylawTitleMap[bylawNumber] || `Bylaw No. ${bylawNumber}`;
    }
    
    if (bylawNumber && VALIDATED_BYLAWS.includes(bylawNumber)) {
      // Add bylaw citation component if we have a valid bylaw number
      segments.push(
        <BylawCitation
          key={`bylaw-${key++}`}
          bylawNumber={bylawNumber}
          title={title}
          section={section}
          excerpt={`Referenced in text as: "${fullMatch}"`}
          isVerified={VALIDATED_BYLAWS.includes(bylawNumber)}
        />
      );
    } else {
      // If no valid bylaw number, just render as text
      segments.push(
        <Markdown key={`text-${key++}`} className={className}>
          {fullMatch}
        </Markdown>
      );
    }
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add any remaining text after the last match
  if (lastIndex < children.length) {
    segments.push(
      <Markdown key={`text-${key++}`} className={className}>
        {children.substring(lastIndex)}
      </Markdown>
    );
  }
  
  return <>{segments}</>;
}

// Helper function to get bylaw number from name (for common bylaws without numbers in text)
function getBylawNumberFromName(bylawName: string): string | null {
  const bylawNameLower = bylawName.toLowerCase();
  
  // Map common bylaw name patterns to their numbers
  const namePatterns: Record<string, string> = {
    'building and plumbing': '4247',
    'tree protection': '4742',
    'anti-noise': '3210',
    'streets and traffic': '4100',
    'streets traffic': '4100',
    'zoning': '3531',
    'parks and beaches': '4672',
    'subdivision': '3578',
    'uplands': '3545',
    'refuse collection': '4371',
    'board of variance': '4183',
    'property tax exemption': '4849',
    'tax rates': '4861',
    'development cost charge': '4891',
    'amenity cost charge': '4892',
    'sign': '3946',
    'animal control': '4013'
  };
  
  // Find a matching pattern
  for (const [pattern, number] of Object.entries(namePatterns)) {
    if (bylawNameLower.includes(pattern)) {
      return number;
    }
  }
  
  // Check if the title is in our centralized bylawTitleMap
  // (reverse lookup - find bylaw number from title)
  for (const [number, title] of Object.entries(bylawTitleMap)) {
    if (bylawNameLower.includes(title.toLowerCase())) {
      return number;
    }
  }
  
  return null;
}