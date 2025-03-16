/**
 * Main optimization utilities integration file
 * This file integrates all the optimization strategies implemented in the project
 */

import { profiler } from './utils/profiler';
import { createDatabaseIndexes } from './db/indexes';

/**
 * Initialize optimizations for the application
 * This should be called during application startup
 */
export async function initializeOptimizations() {
  console.log('⏳ Initializing application optimizations...');
  const start = Date.now();

  try {
    // Initialize database indexes
    await createDatabaseIndexes();
    
    // Additional initialization can be added here
    
    console.log(`✅ Optimizations initialized in ${Date.now() - start}ms`);
    
    // Log system info in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 System information:');
      console.log(`  Node.js: ${process.version}`);
      console.log(`  Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB RSS`);
      console.log(`  Environment: ${process.env.NODE_ENV}`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize optimizations:', error);
  }
}

/**
 * Get all performance metrics collected by the profiler
 */
export function getPerformanceMetrics() {
  return profiler.getMetrics();
}

/**
 * Reset performance metrics
 */
export function resetPerformanceMetrics() {
  profiler.resetMetrics();
}

/**
 * Measure performance of a function
 * @returns The result of the function and the time it took to execute
 */
export async function measurePerformance<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    return { result, duration };
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`❌ ${label} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}