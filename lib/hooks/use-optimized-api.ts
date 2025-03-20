/**
 * Optimized API hooks for data fetching
 * Combines SWR caching with batched API calls
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import useSWR, { type SWRConfiguration } from 'swr';
import { profiler } from '@/lib/utils/profiler';

// Simple debounce implementation to avoid import errors
function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  wait = 300
): T {
  const timeout = useRef<NodeJS.Timeout>();
  const fnRef = useRef(fn);
  
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  
  // Using an inline function as recommended by the lint rule
  return useCallback(function debouncedFn(...args: Parameters<T>) {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      
      timeout.current = setTimeout(() => {
        fnRef.current(...args);
      }, wait);
    } as unknown as T,
    [wait]
  );
}

// Shared fetcher for SWR
const defaultFetcher = async (url: string) => {
  profiler.start(`fetch-${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    return res.json();
  } finally {
    profiler.end(`fetch-${url}`);
  }
};

interface UseApiOptions<T> extends SWRConfiguration<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

/**
 * Hook for optimized API data fetching with automatic caching
 */
export function useApi<T = any>(
  url: string | null,
  options: UseApiOptions<T> = {}
) {
  const {
    onSuccess,
    onError,
    enabled = true,
    ...swrOptions
  } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    enabled && url ? url : null,
    defaultFetcher,
    {
      ...swrOptions,
      onSuccess,
      onError,
    }
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for searching with automatic debouncing and caching
 */
export function useSearch<T = any>(
  baseUrl: string,
  options: {
    defaultParams?: Record<string, string>;
    debounceMs?: number;
    enabled?: boolean;
    swrOptions?: SWRConfiguration<T>;
  } = {}
) {
  const {
    defaultParams = {},
    debounceMs = 300,
    enabled = true,
    swrOptions = {},
  } = options;

  const [searchParams, setSearchParams] = useState<Record<string, string>>(defaultParams);
  const [debouncedParams, setDebouncedParams] = useState<Record<string, string>>(defaultParams);

  // Create the search URL with query parameters
  const searchUrl = useCallback(
    (params: Record<string, string>) => {
      if (!enabled || !Object.keys(params).some(k => !!params[k])) return null;
      
      const url = new URL(baseUrl, window.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
      });
      
      return url.toString();
    },
    [baseUrl, enabled]
  );

  // Apply debouncing to search params
  const debouncedSetParams = useDebounce((params: Record<string, string>) => {
    setDebouncedParams(params);
  }, debounceMs);

  // Update search parameters
  const updateSearch = useCallback(
    (params: Partial<Record<string, string>>) => {
      const newParams = { ...searchParams, ...params };
      setSearchParams(newParams);
      debouncedSetParams(newParams);
    },
    [searchParams, debouncedSetParams]
  );

  // Get search results with SWR
  const { data, error, isLoading, isValidating } = useApi<T>(
    searchUrl(debouncedParams),
    {
      ...swrOptions,
      enabled,
    }
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    searchParams,
    updateSearch,
  };
}