'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StatusPage() {
  const [status, setStatus] = useState({
    environment: 'Loading...',
    dbConnection: 'Checking...',
    apiConnections: {
      anthropic: 'Checking...',
      openai: 'Checking...',
      pinecone: 'Checking...',
    },
    nextAuth: 'Checking...',
    buildInfo: {
      nextVersion: 'Checking...',
      nodeVersion: 'Checking...',
    },
    loading: true,
  });

  useEffect(() => {
    // Gather environment information
    const environment = process.env.NODE_ENV || 'development';

    // Check database connection
    const dbConnectionFailed =
      typeof window !== 'undefined' && (window as any).__DB_CONNECTION_FAILED;

    // Gather Next.js and Node.js versions
    const nextVersion = process.env.NEXT_VERSION || 'Unknown';
    const nodeVersion = process.versions?.node || 'Unknown';

    // Update basic status
    setStatus((prev) => ({
      ...prev,
      environment,
      dbConnection: dbConnectionFailed ? 'Failed' : 'Connected',
      buildInfo: {
        nextVersion,
        nodeVersion,
      },
      loading: false,
    }));

    // Check API connections
    const checkApis = async () => {
      try {
        const res = await fetch('/api/dev/metrics');
        if (res.ok) {
          const data = await res.json();
          setStatus((prev) => ({
            ...prev,
            apiConnections: {
              anthropic: data.anthropic ? 'Connected' : 'Not connected',
              openai: data.openai ? 'Connected' : 'Not connected',
              pinecone: data.pinecone ? 'Connected' : 'Not connected',
            },
          }));
        }
      } catch (error) {
        console.error('Failed to check API status:', error);
        setStatus((prev) => ({
          ...prev,
          apiConnections: {
            anthropic: 'Error checking',
            openai: 'Error checking',
            pinecone: 'Error checking',
          },
        }));
      }
    };

    checkApis();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gray-50 p-4 pt-16 dark:bg-gray-900">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          FebChat System Status
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Diagnostic information to help troubleshoot issues
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        {/* Environment Status */}
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="bg-gray-100 px-4 py-2 font-medium dark:bg-gray-800">
            Environment Status
          </div>
          <div className="p-4">
            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="text-gray-600 dark:text-gray-400">
                Environment:
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {status.environment}
              </div>

              <div className="text-gray-600 dark:text-gray-400">
                Database Connection:
              </div>
              <div
                className={`font-medium ${
                  status.dbConnection === 'Connected'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {status.dbConnection}
              </div>

              <div className="text-gray-600 dark:text-gray-400">
                Next.js Version:
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {status.buildInfo.nextVersion}
              </div>

              <div className="text-gray-600 dark:text-gray-400">
                Node.js Version:
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {status.buildInfo.nodeVersion}
              </div>
            </div>
          </div>
        </div>

        {/* API Connections */}
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="bg-gray-100 px-4 py-2 font-medium dark:bg-gray-800">
            API Connections
          </div>
          <div className="p-4">
            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="text-gray-600 dark:text-gray-400">
                Anthropic API:
              </div>
              <div
                className={`font-medium ${
                  status.apiConnections.anthropic === 'Connected'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {status.apiConnections.anthropic}
              </div>

              <div className="text-gray-600 dark:text-gray-400">
                OpenAI API:
              </div>
              <div
                className={`font-medium ${
                  status.apiConnections.openai === 'Connected'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {status.apiConnections.openai}
              </div>

              <div className="text-gray-600 dark:text-gray-400">
                Pinecone Vector DB:
              </div>
              <div
                className={`font-medium ${
                  status.apiConnections.pinecone === 'Connected'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {status.apiConnections.pinecone}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center space-x-4">
          <Link
            href="/"
            className="rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Back to Home
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}
