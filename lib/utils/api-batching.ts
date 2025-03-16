/**
 * API batching utilities for optimizing LLM API calls
 */

import { cache } from 'react';
import { Profiler } from './profiler';

type BatchOptions = {
  maxBatchSize?: number;
  maxWaitTime?: number; // in milliseconds
  retryCount?: number;
  retryDelay?: number; // in milliseconds
};

const defaultOptions: BatchOptions = {
  maxBatchSize: 5,
  maxWaitTime: 50, // 50ms max wait time
  retryCount: 3,
  retryDelay: 300,
};

/**
 * Class for batching API calls to LLM providers
 */
export class APIBatcher<T, R> {
  private queue: Array<{
    input: T;
    resolve: (value: R) => void;
    reject: (reason: any) => void;
  }> = [];
  private timer: NodeJS.Timeout | null = null;
  private options: BatchOptions;
  private batchProcessor: (inputs: T[]) => Promise<R[]>;
  private profiler = new Profiler();

  constructor(batchProcessor: (inputs: T[]) => Promise<R[]>, options: BatchOptions = {}) {
    this.batchProcessor = batchProcessor;
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Adds a request to the batch queue
   */
  public async add(input: T): Promise<R> {
    this.profiler.start('batch-queue-time');
    
    return new Promise<R>((resolve, reject) => {
      this.queue.push({ input, resolve, reject });
      
      // If this is the first item, start the timer
      if (this.queue.length === 1) {
        this.startTimer();
      }
      
      // If we've reached max batch size, process immediately
      if (this.queue.length >= (this.options.maxBatchSize || 5)) {
        this.processBatch();
      }
    });
  }

  /**
   * Starts the batch processing timer
   */
  private startTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    
    this.timer = setTimeout(() => {
      this.processBatch();
    }, this.options.maxWaitTime);
  }

  /**
   * Processes the current batch of requests
   */
  private async processBatch(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (this.queue.length === 0) return;
    
    const batch = [...this.queue];
    this.queue = [];
    
    const inputs = batch.map(item => item.input);
    
    this.profiler.start('batch-processing-time');
    
    try {
      // Process the batch with retries
      const results = await this.processWithRetries(inputs);
      
      // Resolve each promise with its corresponding result
      batch.forEach((item, index) => {
        const queueTime = this.profiler.end('batch-queue-time');
        this.profiler.start('batch-process-individual');
        item.resolve(results[index]);
        this.profiler.end('batch-process-individual');
      });
    } catch (error) {
      // If batch processing fails, reject all promises
      batch.forEach(item => item.reject(error));
    } finally {
      this.profiler.end('batch-processing-time');
    }
  }

  /**
   * Process with automatic retries
   */
  private async processWithRetries(inputs: T[]): Promise<R[]> {
    let lastError: any;
    
    for (let attempt = 0; attempt < (this.options.retryCount || 3); attempt++) {
      try {
        return await this.batchProcessor(inputs);
      } catch (error) {
        lastError = error;
        
        // Exponential backoff with jitter
        const delay = (this.options.retryDelay || 300) * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

/**
 * Cache function results using React's cache
 */
export function createCachedFunction<Args extends any[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyFn?: (...args: Args) => string
) {
  return cache(async (...args: Args): Promise<Result> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const cachedResult = await fn(...args);
    return cachedResult;
  });
}
