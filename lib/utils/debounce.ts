/**
 * Debounce utility for React hooks
 *
 * This utility provides hooks for debouncing function calls and values,
 * useful for search inputs, window resize handlers, and other high-frequency events.
 */

import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * A hook that returns a debounced version of the passed function.
 * The debounced function will only be called after the specified delay
 * has elapsed since the last time it was invoked.
 *
 * @param fn The function to debounce
 * @param wait The delay in milliseconds (default: 300ms)
 * @returns The debounced function
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  wait = 300,
): T {
  const timeout = useRef<NodeJS.Timeout>();
  const fnRef = useRef(fn);

  // Update the function reference when it changes
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  // Create a memoized debounced function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    function debouncedFn(...args: Parameters<T>) {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }

      timeout.current = setTimeout(() => {
        fnRef.current(...args);
      }, wait);
    } as unknown as T,
    [wait],
  );
}

/**
 * Creates a debounced version of a value
 *
 * @param value The value to debounce
 * @param delay The debounce delay in milliseconds
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * A regular (non-hook) debounce function for use outside of React components
 *
 * @param fn The function to debounce
 * @param wait The delay in milliseconds (default: 300ms)
 * @returns The debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait = 300,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | undefined;

  return function debouncedFn(...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      fn(...args);
    }, wait);
  };
}
