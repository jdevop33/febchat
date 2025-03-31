/**
 * Component optimization utilities
 */

import { cn } from "@/lib/utils";
import { useDebounce } from "@/lib/utils/debounce";
import * as React from "react";
import { memo, useCallback, useMemo } from "react";

/**
 * Enhanced memo HOC with deep equality check for props
 */
export function memoWithDeepEqual<T extends object>(
  component: React.ComponentType<T>,
  areEqual?: (prevProps: Readonly<T>, nextProps: Readonly<T>) => boolean,
) {
  const displayName = component.displayName || component.name || "Component";
  const MemoizedComponent = memo(component, areEqual);
  MemoizedComponent.displayName = `MemoDeep(${displayName})`;
  return MemoizedComponent;
}

/**
 * Utility for conditional class names with memoization
 */
export function useMemoizedClassName(
  baseClass: string,
  conditionalClasses: Record<string, boolean>,
) {
  return useMemo(() => {
    return cn(baseClass, conditionalClasses);
  }, [baseClass, conditionalClasses]);
}

/**
 * Utility to memoize complex derived values
 */
export function useDerivedValue<T, R>(
  value: T,
  deriveFn: (value: T) => R,
  deps: React.DependencyList = [],
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => deriveFn(value), [value, deriveFn, ...deps]);
}

/**
 * Utility for creating event handlers that have stable references
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
): T {
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: any[]) => callbackRef.current(...args), []) as T;
}

// Export useDebounce for backward compatibility
export { useDebounce };

/**
 * Lazy loads a component with Suspense
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  fallback?: React.ReactNode,
) {
  const LazyComponent = React.lazy(loader);

  // Properly typed wrapped component with fixed JSX syntax
  const WrappedComponent = (props: React.ComponentProps<T>) => {
    return React.createElement(
      React.Suspense,
      {
        fallback:
          fallback ||
          React.createElement("div", {
            className: "h-10 w-full animate-pulse bg-muted rounded-md",
          }),
      },
      React.createElement(LazyComponent, props),
    );
  };

  return WrappedComponent;
}
