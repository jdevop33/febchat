

export interface ToolExecutionOptions {
  runId?: string;
  abortSignal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

// Type definition for the execute method of a tool
export type ToolExecuteMethod<TInput = unknown, TOutput = unknown> = 
  (input: TInput, options?: ToolExecutionOptions) => Promise<TOutput>;

// Create a simple wrapper to handle both formats of execute method
export function createToolExecutor<TInput = unknown, TOutput = unknown>(
  originalExecute: ToolExecuteMethod<TInput, TOutput> | ((input: TInput) => Promise<TOutput>)
): ToolExecuteMethod<TInput, TOutput> {
  return async (input: TInput, options?: ToolExecutionOptions): Promise<TOutput> => {
    try {
      // Try with options
      if (options) {
        return await originalExecute(input, options);
      } else {
        // Try without options
        return await originalExecute(input);
      }
    } catch (error) {
      console.error('Error executing tool:', error);
      throw error;
    }
  };
}

