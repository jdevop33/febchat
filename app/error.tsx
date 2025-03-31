"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw, Terminal } from "lucide-react";
import { useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Handle the reset/retry action
  const handleReset = () => {
    setRetrying(true);
    // Small delay to show the retrying state
    setTimeout(() => {
      reset();
      setRetrying(false);
    }, 1000);
  };

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
          <div className="w-full max-w-md rounded-lg border border-amber-200 bg-white p-6 shadow-lg dark:border-amber-800/30 dark:bg-gray-800">
            <div className="mb-6 flex items-center justify-center">
              <AlertTriangle className="h-12 w-12 text-amber-500" />
            </div>

            <h1 className="mb-2 text-center text-2xl font-bold text-amber-700 dark:text-amber-400">
              Something went wrong
            </h1>

            <p className="mb-6 text-center text-gray-600 dark:text-gray-300">
              We encountered an unexpected error. Please try again or return
              home.
            </p>

            <div className="mb-6 flex flex-col space-y-2 sm:flex-row sm:space-x-3 sm:space-y-0">
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800"
                onClick={handleReset}
                disabled={retrying}
              >
                {retrying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Trying to recover...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try again
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="flex-1 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900"
                onClick={() => (window.location.href = "/")}
              >
                <Home className="mr-2 h-4 w-4" />
                Return home
              </Button>
            </div>

            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                onClick={() => setShowDetails(!showDetails)}
              >
                <Terminal className="mr-2 h-4 w-4" />
                {showDetails ? "Hide" : "Show"} technical details
              </Button>

              {showDetails && (
                <div className="mt-3 max-h-60 overflow-auto rounded-md bg-gray-100 p-3 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-300">
                  <p className="mb-1 font-bold">Error:</p>
                  <p className="mb-2">{error.message}</p>
                  {error.stack && (
                    <>
                      <p className="mb-1 font-bold">Stack Trace:</p>
                      <pre className="whitespace-pre-wrap">{error.stack}</pre>
                    </>
                  )}
                  {error.digest && (
                    <>
                      <p className="mb-1 font-bold">Error ID:</p>
                      <code>{error.digest}</code>
                    </>
                  )}
                </div>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
