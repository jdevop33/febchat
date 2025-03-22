'use client';

import type { Attachment, Message } from 'ai';
import { useChat } from 'ai/react';
import { useState, useEffect, type ReactNode } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { ChatHeader } from '@/components/chat/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { MultimodalInput } from '@/components/multimodal-input';
import { Messages } from '@/components/messages';
import type { VisibilityType } from '@/components/visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

// Error boundary component for graceful error handling
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = () => {
      setHasError(true);
    };

    window.addEventListener('error', errorHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  if (hasError) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

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
    },
    onError: handleChatError,
  });

  // Extracted error handling function for better readability
  function handleChatError(error: unknown) {
    console.error('Chat request error:', error);

    // Default error messages
    let errorMessage = 'An error occurred, please try again!';
    let errorDescription = 'The system is experiencing technical difficulties.';

    // Check if error is from PDF viewer or bylaw citation
    const isPdfOrBylawError =
      (error instanceof Error &&
        (error.message.includes('PDF') ||
          error.message.includes('bylaw') ||
          error.message.includes('iframe') ||
          error.message.includes('citation'))) ||
      (typeof error === 'string' &&
        (error.includes('PDF') ||
          error.includes('bylaw') ||
          error.includes('iframe') ||
          error.includes('citation')));

    if (isPdfOrBylawError) {
      errorMessage = 'PDF viewer issue detected';
      errorDescription =
        'There was a problem displaying a bylaw PDF. Your conversation will continue normally.';

      // Log specific error for debugging
      console.warn('PDF/Bylaw rendering error:', error);

      // This is a UI rendering issue, not a critical error
      // Just show a toast but let the conversation continue
      toast.warning(errorMessage, {
        duration: 5000,
        description: errorDescription,
      });

      // Return early to prevent full error display
      return;
    }

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

    // Display error to user
    toast.error(errorMessage, {
      duration: 8000,
      description: errorDescription,
    });
  }

  // Use default value in destructuring to prevent undefined errors
  const { data: votes = [] } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher,
    {
      fallbackData: [],
    },
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <div className="flex h-dvh min-w-0 flex-col bg-background">
      <ChatHeader chatId={id} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Error boundary for messages section */}
        <ErrorBoundary
          fallback={
            <div className="flex-1 p-4 text-center">
              <div className="mt-8 rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
                <p className="mb-2 text-amber-800 dark:text-amber-300">
                  There was an issue displaying some messages.
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  Refresh page
                </Button>
              </div>
            </div>
          }
        >
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
        </ErrorBoundary>

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
              />
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
