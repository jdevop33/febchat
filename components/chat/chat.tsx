'use client';

import type { Attachment, Message } from 'ai';
import { useChat } from 'ai/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { ChatHeader } from './chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from '@/components/ui/visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { toast } from 'sonner';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'reconnecting' | 'disconnected'
  >('connected');
  
  // Store reload function in a ref to avoid dependency cycles
  const reloadFnRef = useRef<() => Promise<string | null | undefined>>();
  
  // Initialize chat visibility
  const { setVisibilityType } = useChatVisibility({
    chatId: id,
    initialVisibility: selectedVisibilityType,
  });

  // Sync visibility type with the selected value from props
  useEffect(() => {
    if (selectedVisibilityType) {
      setVisibilityType(selectedVisibilityType);
    }
  }, [selectedVisibilityType, setVisibilityType]);

  // Error handling function
  const handleChatError = useCallback((error: unknown) => {
    console.error('Chat request error:', error);
    setHasError(true);

    // Default error messages
    let errorMessage = 'An error occurred, please try again!';
    let errorDescription = 'The system is experiencing technical difficulties.';

    // Parse structured error from server if available
    if (typeof error === 'string') {
      try {
        const errorData = JSON.parse(error);
        if (errorData.error) {
          errorMessage = errorData.error;
          errorDescription = errorData.details || errorDescription;
        }
      } catch {
        // If not JSON, use the error string directly
        errorMessage = error;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    }

    // Check for common network errors
    const isNetworkError = 
      errorMessage.includes('network') || 
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout');
    
    if (isNetworkError) {
      setConnectionStatus('reconnecting');
      errorDescription = 'There might be an issue with your network connection. We\'ll try to reconnect.';
      
      // Attempt to automatically retry for network errors
      setRetryCount(currentCount => {
        const newCount = currentCount + 1;
        
        if (newCount <= 2) {
          toast.warning('Connection issue detected', {
            description: `Attempting to reconnect (try ${newCount}/3)...`,
            duration: 3000,
          });
          
          // Try to reload the chat after a delay
          setTimeout(() => {
            if (reloadFnRef.current) {
              reloadFnRef.current();
            }
          }, 2000);
        }
        
        return newCount;
      });
      
      return;
    }

    // Display toast notification for error
    toast.error(errorMessage, {
      duration: 8000,
      description: errorDescription,
    });
  }, []);

  // Initialize chat
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, selectedChatModel },
    initialMessages,
    api: '/api/chat',
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate('/api/history');
      setHasError(false);
      setConnectionStatus('connected');
      setRetryCount(0);
    },
    onError: handleChatError,
  });

  // Update reload ref whenever it changes
  useEffect(() => {
    reloadFnRef.current = reload;
  }, [reload]);

  // Network and connection status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('connected');
      toast.success('Connection restored', {
        description: 'You are now back online',
      });
    };

    const handleOffline = () => {
      setConnectionStatus('disconnected');
      toast.error('Connection lost', {
        description: 'Your network connection has been lost',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Manual retry handler
  const handleRetry = () => {
    setHasError(false);
    setRetryCount(0);
    reload();
    toast.info('Retrying connection', {
      description: 'Attempting to reconnect to the AI service',
    });
  };

  // Fetch votes for messages
  const { data: votes } = useSWR<Array<Vote>>(
    id ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state: {isVisible: boolean}) => state.isVisible);

  // Early return if no ID is provided
  if (!id) {
    return <div className="flex h-dvh items-center justify-center">Invalid chat session</div>;
  }

  return (
    <div className="flex h-dvh min-w-0 flex-col bg-background">
      <ChatHeader chatId={id} />
      
      {connectionStatus !== 'connected' && (
        <div className="bg-amber-100 p-2 text-center text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          {connectionStatus === 'reconnecting' ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="size-4 animate-spin" />
              Attempting to reconnect...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <AlertTriangle className="size-4" />
              Network connection lost. Check your internet connection.
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Messages
          chatId={id}
          isLoading={isLoading}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        {hasError && (
          <div className="border-t border-amber-200 bg-amber-50/50 p-3 text-center dark:border-amber-800/30 dark:bg-amber-900/20">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-800 dark:text-amber-300">Connection issue detected</span>
              <button
                onClick={handleRetry}
                className="ml-2 flex items-center gap-1 rounded bg-amber-200 px-3 py-1 text-sm font-medium text-amber-900 hover:bg-amber-300 dark:bg-amber-700/50 dark:text-amber-100 dark:hover:bg-amber-700"
              >
                <RefreshCw className="size-3" />
                Retry
              </button>
              <button
                onClick={() => setHasError(false)}
                className="ml-1 rounded-full p-1 text-amber-600 hover:bg-amber-200 dark:text-amber-400 dark:hover:bg-amber-800"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        <div className="border-t bg-background">
          <form className="mx-auto flex w-full max-w-3xl gap-2 p-4">
            {!isReadonly && (
              <MultimodalInput
                chatId={id}
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                append={append}
                disabled={connectionStatus === 'disconnected'}
              />
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
