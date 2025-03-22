'use client';

import React from 'react';
import { Markdown } from '@/components/markdown';
import { BylawCitation } from '@/components/bylaw/bylaw-citation';
import { CitationFallback } from '@/components/bylaw/citation-fallback';
import {
  VALIDATED_BYLAWS,
  BYLAW_TITLE_MAP as bylawTitleMap,
} from '@/lib/utils/bylaw-maps-client';

interface EnhancedMarkdownProps {
  children: string;
  className?: string;
}

export function EnhancedMarkdown({
  children,
  className,
}: EnhancedMarkdownProps) {
  try {
    // Regular expression to match bylaw references with number capture groups and optional section
    const bylawRegex =
      /(?:Oak Bay(?:'s)?|Municipal)?\s*(?:((?:Building and Plumbing|Tree Protection|Anti-Noise|Streets[- ]Traffic|Zoning|Parks and Beaches|Subdivision|Uplands|Refuse Collection|Board of Variance|Property Tax(?:\s+Exemption)?|Tax Rates|Development Cost Charge|Amenity Cost Charge|Sign|Animal Control)\s+Bylaw(?:\s*\(?(?:No\.?|Number)?\s*(\d{4})\)?)?)|(?:Bylaw(?:\s+(?:No\.?|Number)?)?\s*(\d{4})))(?:,?\s*(?:Section|Sec\.|§)\s*([\w\d\.\(\)]+))?/gi;

    // Safety check for content
    if (!children || typeof children !== 'string') {
      console.log(
        'EnhancedMarkdown received invalid children:',
        typeof children,
      );
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
    while ((match = bylawRegex.exec(children))) {
      // Add text before match
      if (match.index > lastIndex) {
        segments.push(
          <Markdown key={`text-${key++}`} className={className}>
            {children.substring(lastIndex, match.index)}
          </Markdown>,
        );
      }

      // Extract bylaw info
      const fullMatch = match[0];
      const bylawName = match[1];
      const bylawNumber =
        match[2] ||
        match[3] ||
        (bylawName ? getBylawNumberFromName(bylawName) : null);
      const section = match[4] || '1'; // Get section if available, default to 1

      // Safe check for bylaw number
      if (!bylawNumber) {
        segments.push(
          <Markdown key={`text-${key++}`} className={className}>
            {fullMatch}
          </Markdown>,
        );
        lastIndex = match.index + fullMatch.length;
        continue;
      }

      // Get a title for the bylaw using centralized mapping (safely)
      let title = bylawName;
      if (!title && bylawNumber) {
        try {
          // Ensure bylawTitleMap is defined before accessing it
          const titleMap = bylawTitleMap || {};
          // Get title from centralized bylaw map
          title = titleMap[bylawNumber] || `Bylaw No. ${bylawNumber}`;
        } catch (error) {
          console.error('Error accessing bylaw title map:', error);
          title = `Bylaw No. ${bylawNumber}`;
        }
      }

      // Fallback validation list if imports fail
      const fallbackValidBylaws = [
        '3210',
        '3531',
        '4100',
        '4247',
        '4742',
        '4849',
        '4861',
        '4891',
        '4892',
        '3578',
        '4672',
        '3545',
        '4371',
        '4183',
        '3946',
        '4013',
      ];

      // Safe validation check to ensure VALIDATED_BYLAWS exists and is an array
      const validatedBylaws =
        VALIDATED_BYLAWS &&
        Array.isArray(VALIDATED_BYLAWS) &&
        VALIDATED_BYLAWS.length > 0
          ? VALIDATED_BYLAWS
          : fallbackValidBylaws;

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
                      console.error(
                        'Error creating BylawCitation component:',
                        citationError,
                      );
                      return null;
                    }
                  })();

                  // If component creation succeeded, render it with a fallback
                  return (
                    CitationComponent || (
                      <CitationFallback
                        bylawNumber={bylawNumber}
                        formattedTitle={title || `Bylaw No. ${bylawNumber}`}
                        error={new Error('Failed to render citation component')}
                      />
                    )
                  );
                } catch (renderError) {
                  // Ultimate fallback if everything else fails
                  console.error(
                    'Critical error in bylaw citation rendering:',
                    renderError,
                  );
                  return (
                    <CitationFallback
                      bylawNumber={bylawNumber}
                      formattedTitle={fullMatch}
                      error={
                        renderError instanceof Error
                          ? renderError
                          : new Error('Critical rendering error')
                      }
                    />
                  );
                }
              })()}
            </div>,
          );
        } catch (error) {
          console.error('Error rendering BylawCitation:', error);
          segments.push(
            <Markdown key={`text-${key++}`} className={className}>
              {fullMatch}
            </Markdown>,
          );
        }
      } else {
        // If no valid bylaw number, just render as text
        segments.push(
          <Markdown key={`text-${key++}`} className={className}>
            {fullMatch}
          </Markdown>,
        );
      }

      lastIndex = match.index + fullMatch.length;
    }

    // Add any remaining text after the last match
    if (lastIndex < children.length) {
      segments.push(
        <Markdown key={`text-${key++}`} className={className}>
          {children.substring(lastIndex)}
        </Markdown>,
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
    zoning: '3531',
    'parks and beaches': '4672',
    subdivision: '3578',
    uplands: '3545',
    'refuse collection': '4371',
    'board of variance': '4183',
    'property tax exemption': '4849',
    'tax rates': '4861',
    'development cost charge': '4891',
    'amenity cost charge': '4892',
    sign: '3946',
    'animal control': '4013',
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
        if (
          typeof title === 'string' &&
          bylawNameLower.includes(title.toLowerCase())
        ) {
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
