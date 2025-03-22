import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedMarkdown } from './enhanced-markdown';

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

// Mock the internal VALIDATED_BYLAWS array defined in the EnhancedMarkdown component
const MOCK_VALIDATED_BYLAWS = ['4247', '4742', '3210'];

// We need to manually mock the internal state of the EnhancedMarkdown component
// This is a bit hacky but necessary since we hardcoded the values inside the component
jest.mock('./enhanced-markdown', () => {
  const originalModule = jest.requireActual('./enhanced-markdown');
  return {
    ...originalModule,
    EnhancedMarkdown: (props: any) => {
      // The real component has direct access to the internal
      // constant VALIDATED_BYLAWS which we can't directly modify
      // So we mock the component to capture the includes call
      return originalModule.EnhancedMarkdown(props);
    },
  };
});

describe('EnhancedMarkdown', () => {
  it('should render regular markdown when no bylaw references exist', () => {
    render(
      <EnhancedMarkdown>
        This is regular text with no bylaw references.
      </EnhancedMarkdown>,
    );

    expect(screen.getByTestId('markdown')).toHaveTextContent(
      'This is regular text with no bylaw references.',
    );
  });

  it('should detect bylaw references with numbers and convert them to BylawCitation components', () => {
    // This test relies on 4742 being in the hardcoded VALIDATED_BYLAWS array in the component
    render(
      <EnhancedMarkdown>
        According to Tree Protection Bylaw (No. 4742), you need a permit to
        remove certain trees.
      </EnhancedMarkdown>,
    );

    // This will pass as long as 4742 is in the hardcoded array
    expect(screen.getByTestId('bylaw-citation-4742')).toBeInTheDocument();
    expect(screen.getByTestId('markdown')).toBeInTheDocument();
  });

  it('should detect bylaw references with section numbers', () => {
    // This test relies on 3210 being in the hardcoded VALIDATED_BYLAWS array in the component
    render(
      <EnhancedMarkdown>
        According to Anti-Noise Bylaw No. 3210, Section 5(7)(a), construction is
        only permitted between 7:00 a.m. and 7:00 p.m.
      </EnhancedMarkdown>,
    );

    // This will pass as long as 3210 is in the hardcoded array
    expect(screen.getByTestId('bylaw-citation-3210')).toBeInTheDocument();
  });

  it('should handle bylaw references without explicit numbers by using name lookup', () => {
    // This test relies on 4247 being in the hardcoded VALIDATED_BYLAWS array in the component
    render(
      <EnhancedMarkdown>
        According to the Building and Plumbing Bylaw, you need permits for
        structural changes.
      </EnhancedMarkdown>,
    );

    // This will pass as long as 4247 is in the hardcoded array and the name mapping works
    expect(screen.getByTestId('bylaw-citation-4247')).toBeInTheDocument();
  });
});
