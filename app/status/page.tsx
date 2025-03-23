'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check, X, AlertTriangle, Wifi, Database, Search, FileText } from 'lucide-react';

interface SystemStatus {
  healthy: boolean;
  message: string;
  lastChecked: string;
}

interface StatusCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'error' | 'unknown';
  message: string;
  icon: React.ElementType;
}

export default function StatusPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    healthy: false,
    message: 'Checking system status...',
    lastChecked: new Date().toISOString(),
  });
  
  const [serviceStatuses, setServiceStatuses] = useState<StatusCheck[]>([
    { name: 'API Services', status: 'unknown', message: 'Checking...', icon: Wifi },
    { name: 'Database', status: 'unknown', message: 'Checking...', icon: Database },
    { name: 'Vector Search', status: 'unknown', message: 'Checking...', icon: Search },
    { name: 'PDF Services', status: 'unknown', message: 'Checking...', icon: FileText },
  ]);

  const checkStatus = async () => {
    setIsLoading(true);
    
    try {
      // API check
      let apiStatus: StatusCheck = { 
        name: 'API Services', 
        status: 'error', 
        message: 'Failed to connect',
        icon: Wifi
      };
      
      try {
        const apiResponse = await fetch('/api/bylaws/search?q=test', { 
          method: 'GET',
          cache: 'no-cache',
        });
        
        if (apiResponse.ok) {
          apiStatus = { 
            name: 'API Services', 
            status: 'healthy', 
            message: 'All API services are operational',
            icon: Wifi
          };
        } else {
          apiStatus = { 
            name: 'API Services', 
            status: 'degraded', 
            message: `API responded with status ${apiResponse.status}`,
            icon: Wifi
          };
        }
      } catch (error) {
        console.error('API check error:', error);
      }
      
      // Vector search check
      let vectorStatus: StatusCheck = { 
        name: 'Vector Search', 
        status: 'error', 
        message: 'Failed to connect to vector database',
        icon: Search
      };
      
      try {
        const vectorResponse = await fetch('/api/bylaws/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'test search' }),
          cache: 'no-cache',
        });
        
        if (vectorResponse.ok) {
          const data = await vectorResponse.json();
          vectorStatus = { 
            name: 'Vector Search', 
            status: 'healthy', 
            message: `Vector search returned ${data.results?.length || 0} results`,
            icon: Search
          };
        } else {
          vectorStatus = { 
            name: 'Vector Search', 
            status: 'degraded', 
            message: `Vector search responded with status ${vectorResponse.status}`,
            icon: Search
          };
        }
      } catch (error) {
        console.error('Vector search check error:', error);
      }
      
      // PDF service check
      let pdfStatus: StatusCheck = { 
        name: 'PDF Services', 
        status: 'unknown', 
        message: 'PDF service status undetermined',
        icon: FileText
      };
      
      try {
        const pdfResponse = await fetch('/api/bylaws/find-pdf?bylawNumber=3210', {
          cache: 'no-cache',
        });
        
        if (pdfResponse.ok) {
          const data = await pdfResponse.json();
          if (data.found) {
            pdfStatus = { 
              name: 'PDF Services', 
              status: 'healthy', 
              message: 'PDF services are operational',
              icon: FileText
            };
          } else {
            pdfStatus = { 
              name: 'PDF Services', 
              status: 'degraded', 
              message: 'PDF service operational but file not found',
              icon: FileText
            };
          }
        } else {
          pdfStatus = { 
            name: 'PDF Services', 
            status: 'error', 
            message: `PDF service responded with status ${pdfResponse.status}`,
            icon: FileText
          };
        }
      } catch (error) {
        console.error('PDF check error:', error);
      }
      
      // Database check - using the chat history endpoint
      let dbStatus: StatusCheck = { 
        name: 'Database', 
        status: 'error', 
        message: 'Failed to connect to database',
        icon: Database
      };
      
      try {
        const dbResponse = await fetch('/api/history', {
          cache: 'no-cache',
        });
        
        if (dbResponse.ok) {
          dbStatus = { 
            name: 'Database', 
            status: 'healthy', 
            message: 'Database connection is stable',
            icon: Database
          };
        } else if (dbResponse.status === 401) {
          // 401 means the database is working but user isn't authenticated
          dbStatus = { 
            name: 'Database', 
            status: 'healthy', 
            message: 'Database is operational (authentication required)',
            icon: Database
          };
        } else {
          dbStatus = { 
            name: 'Database', 
            status: 'degraded', 
            message: `Database responded with status ${dbResponse.status}`,
            icon: Database
          };
        }
      } catch (error) {
        console.error('Database check error:', error);
      }
      
      // Update all statuses
      const newStatuses = [apiStatus, dbStatus, vectorStatus, pdfStatus];
      setServiceStatuses(newStatuses);
      
      // Update overall system status
      const isHealthy = newStatuses.every(s => s.status === 'healthy' || s.status === 'degraded');
      const hasDegradation = newStatuses.some(s => s.status === 'degraded');
      
      setSystemStatus({
        healthy: isHealthy,
        message: isHealthy 
          ? hasDegradation 
            ? 'System operational with some degraded services' 
            : 'All systems operational'
          : 'System experiencing issues',
        lastChecked: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('Status check error:', error);
      setSystemStatus({
        healthy: false,
        message: 'Error checking system status',
        lastChecked: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // Helper function to get status color
  const getStatusColor = (status: string): string => {
    switch(status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-amber-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'healthy':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8 flex flex-col items-center justify-center text-center">
        <h1 className="mb-2 text-3xl font-bold">System Status</h1>
        <p className="mb-4 text-muted-foreground">
          Current status of the Oak Bay Municipal Bylaws Assistant
        </p>
        <div className="flex items-center">
          <div className={`mr-2 flex h-6 w-6 items-center justify-center rounded-full ${systemStatus.healthy ? 'bg-green-100' : 'bg-red-100'}`}>
            {systemStatus.healthy ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-red-500" />
            )}
          </div>
          <span className={`font-medium ${systemStatus.healthy ? 'text-green-700' : 'text-red-700'}`}>
            {systemStatus.message}
          </span>
        </div>
      </div>

      <div className="mb-6 flex justify-between">
        <p className="text-sm text-muted-foreground">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkStatus}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {serviceStatuses.map((service) => (
          <Card key={service.name} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="flex items-center">
                  <service.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {service.name}
                </div>
              </CardTitle>
              {getStatusIcon(service.status)}
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {service.message}
              </div>
              <div className={`mt-2 text-xs ${getStatusColor(service.status)}`}>
                Status: {service.status}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        <h3 className="mb-2 font-medium">Troubleshooting Tips</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>If vector search is down, try using keyword search instead</li>
          <li>PDF viewing issues can often be resolved by visiting the official website</li>
          <li>For persistent issues, please clear your browser cache and try again</li>
          <li>If database connectivity issues persist, contact your administrator</li>
        </ul>
      </div>
    </div>
  );
}
