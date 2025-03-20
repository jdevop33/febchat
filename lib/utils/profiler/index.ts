/**
 * Simple profiling utility for measuring performance
 */
import * as React from 'react';

type ProfilerOptions = {
  enabled?: boolean;
  logToConsole?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
};

const defaultOptions: ProfilerOptions = {
  enabled: process.env.NODE_ENV !== 'production',
  logToConsole: process.env.NODE_ENV !== 'production',
  logLevel: 'debug',
};

export class Profiler {
  private static instance: Profiler;
  private timers: Map<string, number> = new Map();
  private metrics: Map<
    string,
    { count: number; totalTime: number; min: number; max: number }
  > = new Map();
  private options: ProfilerOptions;

  private constructor(options: ProfilerOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  public static getInstance(options?: ProfilerOptions): Profiler {
    if (!Profiler.instance) {
      Profiler.instance = new Profiler(options);
    }
    return Profiler.instance;
  }

  /**
   * Start timing an operation
   */
  public start(label: string): void {
    if (!this.options.enabled) return;
    this.timers.set(label, performance.now());
  }

  /**
   * End timing an operation and record metrics
   */
  public end(label: string): number {
    if (!this.options.enabled) return 0;

    const startTime = this.timers.get(label);
    if (startTime === undefined) {
      console.warn(
        `Profiler: No timer found for "${label}". Did you forget to call start()?`,
      );
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    this.timers.delete(label);

    // Update metrics
    const existing = this.metrics.get(label);
    if (existing) {
      existing.count += 1;
      existing.totalTime += duration;
      existing.min = Math.min(existing.min, duration);
      existing.max = Math.max(existing.max, duration);
    } else {
      this.metrics.set(label, {
        count: 1,
        totalTime: duration,
        min: duration,
        max: duration,
      });
    }

    // Log to console if enabled
    if (this.options.logToConsole) {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Measure an async function execution time
   */
  public async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  /**
   * Measure a synchronous function execution time
   */
  public measureSync<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      const result = fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  /**
   * Get all collected metrics
   */
  public getMetrics() {
    const result: Record<
      string,
      { count: number; avgTime: number; minTime: number; maxTime: number }
    > = {};

    this.metrics.forEach((value, key) => {
      result[key] = {
        count: value.count,
        avgTime: value.totalTime / value.count,
        minTime: value.min,
        maxTime: value.max,
      };
    });

    return result;
  }

  /**
   * Reset all metrics
   */
  public resetMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }
}

// Export singleton instance
export const profiler = Profiler.getInstance();

/**
 * HOC to profile React components
 */
export function withProfiling<T extends object>(
  Component: React.ComponentType<T>,
  label?: string,
) {
  if (!defaultOptions.enabled) {
    return Component;
  }

  const displayName = Component.displayName || Component.name || 'Component';
  const profilingLabel = label || `Render(${displayName})`;

  const ProfiledComponent = (props: T) => {
    profiler.start(profilingLabel);
    // Use createElement to ensure it works with both function and class components
    const result = React.createElement(Component, props);
    profiler.end(profilingLabel);
    return result;
  };

  ProfiledComponent.displayName = `Profiled(${displayName})`;
  return ProfiledComponent;
}
