'use client';

import type { Attachment, Message } from 'ai';
import { useChat } from 'ai/react';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { toast } from 'sonner';

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
      description: errorDescription
    });
  }

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <div className="flex h-dvh min-w-0 flex-col bg-background">
      <ChatHeader chatId={id} />

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
