'use client';

import React from 'react';
import { Markdown } from '@/components/markdown';
import { BylawCitation } from '@/components/bylaw/bylaw-citation';
import { VALIDATED_BYLAWS } from '@/lib/utils/bylaw-utils';

interface EnhancedMarkdownProps {
  children: string;
  className?: string;
}

export function EnhancedMarkdown({ children, className }: EnhancedMarkdownProps) {
  // Regular expression to match bylaw references with number capture groups and optional section
  const bylawRegex = /(?:Oak Bay(?:'s)?|Municipal)?\s*(?:((?:Building and Plumbing|Tree Protection|Anti-Noise|Streets[- ]Traffic|Zoning|Parks and Beaches|Subdivision|Uplands|Refuse Collection|Board of Variance|Property Tax|Sign|Animal Control)\s+Bylaw(?:\s*\(?(?:No\.?|Number)?\s*(\d{4})\)?)?)|(?:Bylaw(?:\s+(?:No\.?|Number)?)?\s*(\d{4})))(?:,?\s*(?:Section|Sec\.|§)\s*([\w\d\.\(\)]+))?/gi;
  
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
    
    // Get a title for the bylaw
    let title = bylawName;
    if (!title && bylawNumber) {
      // Try to get title from known bylaws
      if (bylawNumber === '4247') title = 'Building and Plumbing Bylaw';
      else if (bylawNumber === '4742') title = 'Tree Protection Bylaw';
      else if (bylawNumber === '3210') title = 'Anti-Noise Bylaw';
      else if (bylawNumber === '4100') title = 'Streets and Traffic Bylaw';
      else if (bylawNumber === '3531') title = 'Zoning Bylaw';
      else if (bylawNumber === '4672') title = 'Parks and Beaches Bylaw';
      else if (bylawNumber === '3578') title = 'Subdivision and Development Bylaw';
      else if (bylawNumber === '3545') title = 'Uplands Bylaw';
      else title = `Bylaw No. ${bylawNumber}`;
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
  
  if (bylawNameLower.includes('building and plumbing')) return '4247';
  if (bylawNameLower.includes('tree protection')) return '4742';
  if (bylawNameLower.includes('anti-noise')) return '3210';
  if (bylawNameLower.includes('streets') && bylawNameLower.includes('traffic')) return '4100';
  if (bylawNameLower.includes('zoning')) return '3531';
  if (bylawNameLower.includes('parks and beaches')) return '4672';
  if (bylawNameLower.includes('subdivision')) return '3578';
  if (bylawNameLower.includes('uplands')) return '3545';
  if (bylawNameLower.includes('refuse collection')) return '4371';
  if (bylawNameLower.includes('board of variance')) return '4183';
  if (bylawNameLower.includes('property tax')) return '4849';
  if (bylawNameLower.includes('sign')) return '3946';
  if (bylawNameLower.includes('animal control')) return '4013';
  
  return null;
}