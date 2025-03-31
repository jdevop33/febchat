"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import React, { Component, type ReactNode, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Root level error boundary to catch any errors in the application
 * Provides a fallback UI for graceful error handling
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error("Error caught by ErrorBoundary:", error);
    console.error("Component stack:", errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="my-4 flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50/40 p-6 dark:border-amber-800/50 dark:bg-amber-900/20">
          <AlertTriangle className="mb-4 h-10 w-10 text-amber-500" />
          <h3 className="mb-2 text-lg font-medium text-amber-800 dark:text-amber-300">
            Something went wrong
          </h3>
          <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
