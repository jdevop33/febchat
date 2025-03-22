import type { Message, ChatRequestOptions } from 'ai';
import type { Vote } from '@/lib/db/schema';
import type { Dispatch, SetStateAction } from 'react';
import type { SharedMessageProps } from '@/types/shared/shared-types';

// Message component props
export interface MessageProps extends SharedMessageProps {
  message: Message;
  vote: Vote | undefined;
}

// Message editor props
export interface MessageEditorProps {
  message: Message;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[]),
  ) => void;
  reload: (
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
}

// Message reasoning props
export interface MessageReasoningProps {
  isLoading: boolean;
  reasoning: string;
}

// Message actions props
export interface MessageActionsProps {
  chatId: string;
  message: Message;
  vote: Vote | undefined;
  isLoading: boolean;
}
