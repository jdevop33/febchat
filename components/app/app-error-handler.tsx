'use client';

import React, { useState, useEffect } from 'react';

interface AppErrorHandlerProps {
  children: React.ReactNode;
}

interface AppErrorState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  diagnostic: Record<string, any>;
}

export function AppErrorHandler({ children }: AppErrorHandlerProps) {
  const [errorState, setErrorState] = useState<AppErrorState>({
    hasError: false,
    error: null,
    errorInfo: null,
    diagnostic: {},
  });

  useEffect(() => {
    // Check for any initialized global error flags
    const diagnostic: Record<string, any> = {};

    // Check database connection status if available
    if (
      typeof window !== 'undefined' &&
      (window as any).__DB_CONNECTION_FAILED
    ) {
      diagnostic.dbConnectionFailed = true;
    }

    // Check environment
    diagnostic.environment = process.env.NODE_ENV || 'unknown';
    diagnostic.isServer = typeof window === 'undefined';

    // Update diagnostic info
    setErrorState((prev) => ({
      ...prev,
      diagnostic,
    }));

    // Add global error listener
    const errorHandler = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setErrorState((prev) => ({
        ...prev,
        hasError: true,
        error: event.error,
      }));
    };

    window.addEventListener('error', errorHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  // Component did catch lifecycle equivalent
  const componentDidCatch = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Error caught by error boundary:', error, errorInfo);
    setErrorState({
      hasError: true,
      error,
      errorInfo,
      diagnostic: errorState.diagnostic,
    });
  };

  // If there's an error, render fallback UI
  if (errorState.hasError || errorState.diagnostic.dbConnectionFailed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-md dark:border-red-800 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-bold text-red-600 dark:text-red-400">
            Application Error
          </h2>

          <div className="mb-4 rounded bg-red-50 p-3 text-sm dark:bg-red-900/30">
            <p className="font-semibold">
              Something went wrong with the application
            </p>
            {errorState.error && (
              <p className="mt-2">{errorState.error.message}</p>
            )}
          </div>

          <div className="mb-4">
            <h3 className="mb-2 font-semibold">Diagnostic Information:</h3>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>Environment: {errorState.diagnostic.environment}</li>
              <li>
                Database Connection:{' '}
                {errorState.diagnostic.dbConnectionFailed ? 'Failed' : 'OK'}
              </li>
              <li>
                Rendering Context:{' '}
                {errorState.diagnostic.isServer ? 'Server' : 'Client'}
              </li>
            </ul>
          </div>

          <div className="space-x-2 text-center">
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Reload Page
            </button>
            <a
              href="/"
              className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, render children normally
  return <>{children}</>;
}

export default class ErrorBoundary extends React.Component<
  AppErrorHandlerProps,
  AppErrorState
> {
  constructor(props: AppErrorHandlerProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      diagnostic: {},
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error('Error caught by error boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <AppErrorHandler>{this.props.children}</AppErrorHandler>;
    }

    return this.props.children;
  }
}
