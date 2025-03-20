/**
 * Bylaw API Client
 * 
 * Provides client-side functions for interacting with the bylaw API endpoints
 */

/**
 * Types for bylaw API interactions
 */
export interface BylawSearchRequest {
  query: string;
  filters?: {
    bylawNumbers?: string[];
    sections?: string[];
  };
  limit?: number;
}

export interface BylawSearchResult {
  id: string;
  bylawNumber: string;
  section: string;
  content: string;
  title: string;
  score: number;
}

export interface BylawSearchResponse {
  results: BylawSearchResult[];
  totalResults: number;
  query: string;
}

export interface BylawFeedbackRequest {
  citationId: string;
  messageId: string;
  helpful: boolean;
  comment?: string;
}

/**
 * Searches bylaws with the provided query
 */
export async function searchBylaws(request: BylawSearchRequest): Promise<BylawSearchResponse> {
  const params = new URLSearchParams();
  params.append('query', request.query);
  
  if (request.limit) {
    params.append('limit', request.limit.toString());
  }
  
  if (request.filters?.bylawNumbers?.length) {
    request.filters.bylawNumbers.forEach(num => 
      params.append('bylawNumbers', num)
    );
  }
  
  if (request.filters?.sections?.length) {
    request.filters.sections.forEach(section => 
      params.append('sections', section)
    );
  }
  
  const response = await fetch(`/api/bylaws/search?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Bylaw search error: ${error}`);
  }
  
  return response.json();
}

/**
 * Gets the PDF URL for a bylaw
 */
export async function getBylawPdf(bylawNumber: string): Promise<{url: string}> {
  const response = await fetch(`/api/bylaws/find-pdf?bylawNumber=${bylawNumber}`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Find bylaw PDF error: ${error}`);
  }
  
  return response.json();
}

/**
 * Submits feedback for a bylaw citation
 */
export async function submitBylawFeedback(feedback: BylawFeedbackRequest): Promise<{success: boolean}> {
  const response = await fetch('/api/bylaws/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(feedback),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Submit bylaw feedback error: ${error}`);
  }
  
  return response.json();
}