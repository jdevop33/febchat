'use client';

import React from 'react';
import { Markdown } from '@/components/markdown';
import { BylawCitation } from '@/components/bylaw/bylaw-citation';
// Hardcoded values to eliminate client/server mismatch
const VALIDATED_BYLAWS = [
  "3210", "3531", "4100", "4247", "4742", "4849", "4861", "4891", "4892"
];

// Hardcoded bylaw title mapping
const bylawTitleMap: Record<string, string> = {
  "3210": "Anti-Noise Bylaw",
  "3531": "Zoning Bylaw",
  "4100": "Streets and Traffic Bylaw",
  "4247": "Building and Plumbing Bylaw",
  "4742": "Tree Protection Bylaw",
  "4849": "Property Tax Exemption Bylaw, 2023",
  "4861": "Tax Rates Bylaw, 2024",
  "4891": "Development Cost Charge Bylaw",
  "4892": "Amenity Cost Charge Bylaw"
};

interface EnhancedMarkdownProps {
  children: string;
  className?: string;
}

export function EnhancedMarkdown({ children, className }: EnhancedMarkdownProps) {
  try {
    // Regular expression to match bylaw references with number capture groups and optional section
    const bylawRegex = /(?:Oak Bay(?:'s)?|Municipal)?\s*(?:((?:Building and Plumbing|Tree Protection|Anti-Noise|Streets[- ]Traffic|Zoning|Parks and Beaches|Subdivision|Uplands|Refuse Collection|Board of Variance|Property Tax(?:\s+Exemption)?|Tax Rates|Development Cost Charge|Amenity Cost Charge|Sign|Animal Control)\s+Bylaw(?:\s*\(?(?:No\.?|Number)?\s*(\d{4})\)?)?)|(?:Bylaw(?:\s+(?:No\.?|Number)?)?\s*(\d{4})))(?:,?\s*(?:Section|Sec\.|§)\s*([\w\d\.\(\)]+))?/gi;
    
    // Safety check for content
    if (!children || typeof children !== 'string') {
      console.log('EnhancedMarkdown received invalid children:', typeof children);
      return <Markdown className={className}>{children || ''}</Markdown>;
    }
    
    // If no bylaw references, just render as regular markdown
    if (!bylawRegex.test(children)) {
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
      
      // Safe check for bylaw number
      if (!bylawNumber) {
        segments.push(
          <Markdown key={`text-${key++}`} className={className}>
            {fullMatch}
          </Markdown>
        );
        lastIndex = match.index + fullMatch.length;
        continue;
      }
      
      // Get a title for the bylaw using centralized mapping (safely)
      let title = bylawName;
      if (!title && bylawNumber) {
        try {
          // Get title from centralized bylaw map
          title = bylawTitleMap?.[bylawNumber] ? 
                 bylawTitleMap[bylawNumber] : 
                 `Bylaw No. ${bylawNumber}`;
        } catch (error) {
          console.error('Error accessing bylaw title map:', error);
          title = `Bylaw No. ${bylawNumber}`;
        }
      }
      
      // Safe validation check
      const validatedBylaws = Array.isArray(VALIDATED_BYLAWS) ? VALIDATED_BYLAWS : [];
      const isValidBylaw = validatedBylaws.includes(bylawNumber);
      
      if (bylawNumber && isValidBylaw) {
        // Add bylaw citation component if we have a valid bylaw number
        try {
          // Super-safe rendering with multiple layers of error protection
          segments.push(
            <div key={`bylaw-wrapper-${key}`} className="bylaw-safe-wrapper">
              {(() => {
                // First error handling layer - component creation
                try {
                  // Create the citation component in an IIFE to isolate errors
                  const CitationComponent = (() => {
                    try {
                      return (
                        <BylawCitation
                          key={`bylaw-${key++}`}
                          bylawNumber={bylawNumber}
                          title={title}
                          section={section}
                          excerpt={`Referenced in text as: "${fullMatch}"`}
                          isVerified={isValidBylaw}
                        />
                      );
                    } catch (citationError) {
                      console.error('Error creating BylawCitation component:', citationError);
                      return null;
                    }
                  })();
                  
                  // If component creation succeeded, render it with a fallback
                  return CitationComponent || (
                    <div className="my-3 p-2 border border-amber-200 bg-amber-50/40 rounded-lg">
                      <p className="text-sm text-amber-800">
                        {fullMatch} <a 
                          href={`https://www.oakbay.ca/bylaws/${bylawNumber}.pdf`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="underline flex items-center gap-1"
                          aria-label={`View Bylaw ${bylawNumber} on official site (opens in new tab)`}
                        >
                          <span>View on official site</span>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="12" 
                            height="12" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            aria-hidden="true"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      </p>
                    </div>
                  );
                } catch (renderError) {
                  // Ultimate fallback if everything else fails
                  console.error('Critical error in bylaw citation rendering:', renderError);
                  return (
                    <span className="text-amber-700 font-medium">
                      {fullMatch} (PDF available on official site)
                    </span>
                  );
                }
              })()}
            </div>
          );
        } catch (error) {
          console.error('Error rendering BylawCitation:', error);
          segments.push(
            <Markdown key={`text-${key++}`} className={className}>
              {fullMatch}
            </Markdown>
          );
        }
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
  } catch (error) {
    console.error('Error in EnhancedMarkdown:', error);
    return <Markdown className={className}>{children || ''}</Markdown>;
  }
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
  
  // Check if the title is in our centralized bylawTitleMap (safely)
  // (reverse lookup - find bylaw number from title)
  try {
    if (bylawTitleMap) {
      for (const [number, title] of Object.entries(bylawTitleMap)) {
        if (typeof title === 'string' && bylawNameLower.includes(title.toLowerCase())) {
          return number;
        }
      }
    }
  } catch (error) {
    console.error('Error in bylawTitleMap lookup:', error);
    // Continue without failing
  }
  
  return null;
}