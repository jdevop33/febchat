'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface AppErrorHandlerProps {
  error: Error | null;
  resetErrorBoundary?: () => void;
  showDetails?: boolean;
  actionText?: string;
  variant?: 'default' | 'critical' | 'minor';
}

export function AppErrorHandler({
  error,
  resetErrorBoundary,
  showDetails = false,
  actionText = 'Try Again',
  variant = 'default',
}: AppErrorHandlerProps) {
  const router = useRouter();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [isTroubleshooting, setIsTroubleshooting] = useState(false);

  // Log the error to console for debugging
  useEffect(() => {
    if (error) {
      console.error('Application error caught by AppErrorHandler:', error);
    }
  }, [error]);

  // Get the correct styling based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return {
          container: 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10',
          icon: 'text-red-500',
          title: 'text-red-700 dark:text-red-300',
          description: 'text-red-600/90 dark:text-red-400/90',
        };
      case 'minor':
        return {
          container: 'border-amber-100 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-900/10',
          icon: 'text-amber-500',  
          title: 'text-amber-700 dark:text-amber-300',
          description: 'text-amber-600/90 dark:text-amber-400/90',
        };
      default:
        return {
          container: 'border-gray-200 bg-gray-50/50 dark:border-gray-800/50 dark:bg-gray-900/20',
          icon: 'text-gray-500',
          title: 'text-gray-700 dark:text-gray-300',
          description: 'text-gray-600/90 dark:text-gray-400/90',
        };
    }
  };

  const styles = getVariantStyles();

  // Start diagnostic checks
  const runDiagnostics = async () => {
    setIsTroubleshooting(true);
    
    try {
      // Check API endpoints
      const apiHealthCheck = await fetch('/api/status', { 
        method: 'GET',
        cache: 'no-cache',
      });
      
      // If successful, allow retry
      if (apiHealthCheck.ok) {
        console.log('API status check passed, enabling retry');
        setIsTroubleshooting(false);
        // If there's a reset function, it will be enabled after diagnostics
      } else {
        console.error('API status check failed:', await apiHealthCheck.text());
      }
    } catch (diagnosticError) {
      console.error('Error during diagnostics:', diagnosticError);
    } finally {
      // Always re-enable retry after a short delay, even if checks fail
      setTimeout(() => {
        setIsTroubleshooting(false);
      }, 2000);
    }
  };

  // Handle action button click
  const handleAction = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      // Reload the page if no reset function is provided
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  // No error, no rendering
  if (!error) return null;

  return (
    <div className={`my-4 flex flex-col items-center justify-center rounded-lg border p-6 ${styles.container}`}>
      <AlertTriangle className={`mb-4 h-10 w-10 ${styles.icon}`} />
      
      <h3 className={`mb-2 text-lg font-medium ${styles.title}`}>
        {variant === 'critical' ? 'Something went wrong' : 'We encountered an issue'}
      </h3>
      
      <p className={`mb-4 text-center text-sm ${styles.description}`}>
        {error?.message || 'An unexpected error occurred'}
      </p>
      
      <div className="flex gap-3">
        <Button
          variant="default"
          onClick={handleAction}
          disabled={isTroubleshooting}
        >
          {isTroubleshooting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {actionText}
            </>
          )}
        </Button>
        
        {variant === 'critical' && (
          <Button
            variant="outline"
            onClick={() => router.push('/')}
          >
            Go to Home
          </Button>
        )}
      </div>

      {showDetails && (
        <div className="mt-6 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          >
            <Terminal className="mr-2 h-4 w-4" />
            {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
          </Button>
          
          {showTechnicalDetails && (
            <div className="mt-2 max-h-40 overflow-auto rounded-md bg-gray-800 p-3 text-xs text-gray-300">
              <p className="mb-1 font-bold text-gray-400">Error Name:</p>
              <p className="mb-2">{error.name}</p>
              <p className="mb-1 font-bold text-gray-400">Error Message:</p>
              <p className="mb-2">{error.message}</p>
              {error.stack && (
                <>
                  <p className="mb-1 font-bold text-gray-400">Stack Trace:</p>
                  <pre className="whitespace-pre-wrap">{error.stack}</pre>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
