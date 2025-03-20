'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ShieldX, RefreshCcw } from 'lucide-react';

// Error descriptions for better user experience
const errorMessages: Record<string, { title: string; description: string }> = {
  'Configuration': {
    title: 'Server Configuration Error',
    description: 'There is a problem with the server configuration. Please contact support.'
  },
  'AccessDenied': {
    title: 'Access Denied',
    description: 'You do not have permission to access this resource.'
  },
  'Verification': {
    title: 'Verification Failed',
    description: 'The verification link may have expired or already been used.'
  },
  'OAuthSignin': {
    title: 'OAuth Sign In Error',
    description: 'There was a problem signing in with the external provider.'
  },
  'OAuthCallback': {
    title: 'OAuth Callback Error',
    description: 'There was a problem with the authentication callback.'
  },
  'OAuthCreateAccount': {
    title: 'Account Creation Error',
    description: 'There was a problem creating your account.'
  },
  'OAuthAccountNotLinked': {
    title: 'Account Not Linked',
    description: 'The email is already used with a different provider.'
  },
  'EmailCreateAccount': {
    title: 'Account Creation Error',
    description: 'There was a problem creating your account with the provided email.'
  },
  'CredentialsSignin': {
    title: 'Invalid Credentials',
    description: 'The email or password you entered is incorrect.'
  },
  'SessionRequired': {
    title: 'Authentication Required',
    description: 'You must be signed in to access this page.'
  },
  'Default': {
    title: 'Authentication Error',
    description: 'An unexpected authentication error occurred.'
  }
};

export default function AuthErrorPage() {
  // We'll use a default error initially
  const [errorType, setErrorType] = useState('Default');
  const [timeRemaining, setTimeRemaining] = useState(10);
  
  // Use useEffect to handle the searchParams to avoid React hydration issues
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setErrorType(params.get('error') || 'Default');
  }, []);
  
  // Get the appropriate error message
  const errorInfo = errorMessages[errorType] || errorMessages.Default;
  
  // Auto-redirect countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      window.location.href = '/login';
      return;
    }
    
    const timer = setTimeout(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeRemaining]);
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 dark:from-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md">
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center pb-2">
              <ShieldX className="size-12 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-semibold text-red-600 dark:text-red-400">
              {errorInfo.title}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {errorInfo.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 rounded-lg bg-red-50 p-3 dark:bg-red-950/50">
              <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">
                {errorType === 'CredentialsSignin' 
                  ? 'Please check your email and password and try again.' 
                  : 'If this problem persists, please contact support.'}
              </p>
            </div>
            
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              <p>Redirecting to login page in {timeRemaining} seconds...</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/">
                Return Home
              </Link>
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800" asChild>
              <Link href="/login" className="flex items-center gap-1">
                <RefreshCcw className="size-4" />
                Try Again
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}