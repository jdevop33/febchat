'use client';

import type { Message } from 'ai';
import { useChat } from 'ai/react';
import { useState, useEffect, type ReactNode } from 'react';

import { ChatHeader } from '@/components/chat/chat-header';
import { generateUUID } from '@/lib/utils';
import { MultimodalInput } from '@/components/multimodal-input';
import { Messages } from '@/components/messages';
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
  selectedVisibilityType: any; // Changed from VisibilityType
  isReadonly: boolean;
}) {
  // Simplified chat component for testing
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
      // Simplified: removed mutate call
      console.log('Chat finished');
    },
    onError: (error) => {
      console.error('Chat error occurred:', error);
      toast.error('An error occurred', {
        description: 'Please try again',
      });
    },
  });

  // Simplified state
  const [attachments, setAttachments] = useState<Array<any>>([]);
  const isArtifactVisible = false; // Simplified

  return (
    <div className="flex h-dvh min-w-0 flex-col bg-background">
      <ChatHeader chatId={id} />

      <div className="flex flex-1 flex-col overflow-hidden">
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
            votes={[]} // Simplified - empty votes array
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