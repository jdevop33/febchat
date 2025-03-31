import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FitForGov Health Check",
  description: "System health check page for FitForGov app",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HealthCheckPage() {
  // Collect system health information
  const nodeEnv = process.env.NODE_ENV || "unknown";
  const deploymentUrl = process.env.NEXTAUTH_URL || "unknown";
  const appName = process.env.APP_NAME || "FitForGov";
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  const hasAuthSecret = !!process.env.NEXTAUTH_SECRET;
  const hasDatabaseUrl =
    !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL;

  // Calculate overall health status
  const hasAllRequiredVars = hasApiKey && hasAuthSecret && hasDatabaseUrl;
  const healthStatus = hasAllRequiredVars ? "healthy" : "unhealthy";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-8 shadow dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {appName} Health Check
          </h1>
          <div
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              healthStatus === "healthy"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {healthStatus === "healthy" ? "Healthy" : "Unhealthy"}
          </div>
        </div>

        <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Component
                </th>
                <th scope="col" className="px-6 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <td className="px-6 py-4 font-medium">Environment</td>
                <td className="px-6 py-4">{nodeEnv}</td>
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <td className="px-6 py-4 font-medium">Deployment URL</td>
                <td className="px-6 py-4">{deploymentUrl}</td>
              </tr>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <td className="px-6 py-4 font-medium">AI API Key</td>
                <td className="px-6 py-4">
                  <StatusBadge status={hasApiKey} />
                </td>
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <td className="px-6 py-4 font-medium">Auth Secret</td>
                <td className="px-6 py-4">
                  <StatusBadge status={hasAuthSecret} />
                </td>
              </tr>
              <tr className="dark:border-gray-700">
                <td className="px-6 py-4 font-medium">Database</td>
                <td className="px-6 py-4">
                  <StatusBadge status={hasDatabaseUrl} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700">
          <div className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Next Steps
          </div>
          {healthStatus === "healthy" ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              The system appears to be properly configured. Please verify user
              authentication and AI functionality.
            </p>
          ) : (
            <ul className="ml-5 list-disc text-sm text-gray-600 dark:text-gray-300">
              {!hasApiKey && (
                <li className="mt-1">
                  Missing AI API key - Add ANTHROPIC_API_KEY to the environment
                  variables
                </li>
              )}
              {!hasAuthSecret && (
                <li className="mt-1">
                  Missing authentication secret - Add NEXTAUTH_SECRET to the
                  environment variables
                </li>
              )}
              {!hasDatabaseUrl && (
                <li className="mt-1">
                  Missing database configuration - Add DATABASE_URL or
                  POSTGRES_URL to the environment variables
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        This page is only visible to administrators
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      {status ? "Available" : "Missing"}
    </span>
  );
}
