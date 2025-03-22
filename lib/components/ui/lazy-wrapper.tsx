/**
 * Lazy component wrapper for code splitting
 */

'use client';

import type React from 'react';
import {
  Suspense,
  lazy,
  type LazyExoticComponent,
  type ComponentType,
} from 'react';
import { cn } from '@/lib/utils';

type LazyWrapperProps = {
  component: LazyExoticComponent<ComponentType<any>>;
  fallback?: React.ReactNode;
  className?: string;
  props?: Record<string, any>;
};

const defaultLoadingFallback = (
  <div className="flex h-full min-h-[100px] w-full items-center justify-center">
    <div className="h-10 w-full max-w-md animate-pulse rounded-md bg-muted" />
  </div>
);

export function LazyWrapper({
  component: Component,
  fallback = defaultLoadingFallback,
  className,
  props = {},
}: LazyWrapperProps) {
  return (
    <div className={cn('w-full', className)}>
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    </div>
  );
}

/**
 * Helper to create lazy-loaded components
 */
export function createLazyComponent<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
) {
  return lazy(importFn);
}

// Example usage:
// const LazyDataGrid = createLazyComponent(() => import('@/components/data-grid'));
// <LazyWrapper component={LazyDataGrid} props={{ data: myData }} />
