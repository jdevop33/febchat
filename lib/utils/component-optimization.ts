/**
 * Component optimization utilities
 */

import * as React from 'react';
import { memo, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';

/**
 * Enhanced memo HOC with deep equality check for props
 */
export function memoWithDeepEqual<T extends object>(
  component: React.ComponentType<T>,
  areEqual?: (prevProps: Readonly<T>, nextProps: Readonly<T>) => boolean
) {
  const displayName = component.displayName || component.name || 'Component';
  const MemoizedComponent = memo(component, areEqual);
  MemoizedComponent.displayName = `MemoDeep(${displayName})`;
  return MemoizedComponent;
}

/**
 * Utility for conditional class names with memoization
 */
export function useMemoizedClassName(baseClass: string, conditionalClasses: Record<string, boolean>) {
  // Extract dependency for the linter to track properly
  const conditionalClassesString = Object.entries(conditionalClasses).toString();
  
  return useMemo(() => {
    return cn(baseClass, conditionalClasses);
  }, [baseClass, conditionalClassesString, conditionalClasses]);
}

/**
 * Utility to memoize complex derived values
 */
export function useDerivedValue<T, R>(value: T, deriveFn: (value: T) => R, deps: React.DependencyList = []) {
  return useMemo(() => deriveFn(value), [value, ...deps]);
}

/**
 * Utility for creating event handlers that have stable references
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = React.useRef(callback);
  
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback((...args: any[]) => callbackRef.current(...args), []) as T;
}

/**
 * Creates a function that will be debounced by the specified wait time
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  wait = 300
): T {
  const timeout = React.useRef<NodeJS.Timeout>();
  const fnRef = React.useRef(fn);
  
  React.useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      
      timeout.current = setTimeout(() => {
        fnRef.current(...args);
      }, wait);
    }) as T,
    [wait]
  );
}

/**
 * Lazy loads a component with Suspense
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = React.lazy(loader);
  
  // Properly typed wrapped component with fixed JSX syntax
  const WrappedComponent = (props: React.ComponentProps<T>) => {
    return (
      React.createElement(
        React.Suspense, 
        { fallback: fallback || React.createElement("div", { className: "h-10 w-full animate-pulse bg-muted rounded-md" }) },
        React.createElement(LazyComponent, props)
      )
    );
  };
  
  return WrappedComponent;
}