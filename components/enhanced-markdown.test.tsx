import React from 'react';
import { render, screen } from '@testing-library/react';
import { EnhancedMarkdown } from './enhanced-markdown';
import { VALIDATED_BYLAWS } from '@/lib/utils/bylaw-utils';

// Mock BylawCitation component
jest.mock('./bylaw/bylaw-citation', () => ({
  BylawCitation: ({ bylawNumber, title, section }: any) => (
    <div data-testid={`bylaw-citation-${bylawNumber}`}>
      {title} (No. {bylawNumber}), Section {section}
    </div>
  ),
}));

// Mock Markdown component
jest.mock('./markdown', () => ({
  Markdown: ({ children }: any) => <div data-testid="markdown">{children}</div>,
}));

describe('EnhancedMarkdown', () => {
  it('should render regular markdown when no bylaw references exist', () => {
    render(<EnhancedMarkdown>This is regular text with no bylaw references.</EnhancedMarkdown>);
    
    expect(screen.getByTestId('markdown')).toHaveTextContent(
      'This is regular text with no bylaw references.'
    );
  });

  it('should detect bylaw references with numbers and convert them to BylawCitation components', () => {
    // Assuming 4742 is in VALIDATED_BYLAWS
    const MOCK_VALIDATED_BYLAWS = ['4742'];
    jest.spyOn(VALIDATED_BYLAWS, 'includes').mockImplementation(
      (bylawNumber) => MOCK_VALIDATED_BYLAWS.includes(bylawNumber as string)
    );

    render(
      <EnhancedMarkdown>
        According to Tree Protection Bylaw (No. 4742), you need a permit to remove certain trees.
      </EnhancedMarkdown>
    );
    
    expect(screen.getByTestId('bylaw-citation-4742')).toBeInTheDocument();
    expect(screen.getByTestId('markdown')).toBeInTheDocument();
  });

  it('should detect bylaw references with section numbers', () => {
    const MOCK_VALIDATED_BYLAWS = ['3210'];
    jest.spyOn(VALIDATED_BYLAWS, 'includes').mockImplementation(
      (bylawNumber) => MOCK_VALIDATED_BYLAWS.includes(bylawNumber as string)
    );

    render(
      <EnhancedMarkdown>
        According to Anti-Noise Bylaw No. 3210, Section 5(7)(a), construction is only permitted between 7:00 a.m. and 7:00 p.m.
      </EnhancedMarkdown>
    );
    
    expect(screen.getByTestId('bylaw-citation-3210')).toBeInTheDocument();
  });

  it('should handle bylaw references without explicit numbers by using name lookup', () => {
    const MOCK_VALIDATED_BYLAWS = ['4247'];
    jest.spyOn(VALIDATED_BYLAWS, 'includes').mockImplementation(
      (bylawNumber) => MOCK_VALIDATED_BYLAWS.includes(bylawNumber as string)
    );

    render(
      <EnhancedMarkdown>
        According to the Building and Plumbing Bylaw, you need permits for structural changes.
      </EnhancedMarkdown>
    );
    
    expect(screen.getByTestId('bylaw-citation-4247')).toBeInTheDocument();
  });
});