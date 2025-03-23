'use client';

import type {
  Attachment,
  ChatRequestOptions,
  CreateMessage,
  Message,
} from 'ai';
import cx from 'classnames';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { sanitizeUIMessages } from '@/lib/utils';

import { ArrowUpIcon, PaperclipIcon, StopIcon } from '@/components/shared/icons';
import { PreviewAttachment } from '@/components/ui/preview-attachment';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SuggestedActions } from '@/components/ui/suggested-actions';
import equal from 'fast-deep-equal';

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  isLoading,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
  disabled,
}: {
  chatId: string;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<Message>;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  className?: string;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    if (disabled) return;
    
    window.history.replaceState({}, '', `/chat/${chatId}`);

    handleSubmit(undefined, {
      experimental_attachments: attachments,
    });

    setAttachments([]);
    setLocalStorageInput('');
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    disabled,
  ]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      toast.error('Failed to upload file, please try again!');
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  return (
    <div className="relative flex w-full flex-col gap-4">
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 &&
        input.length === 0 && (
          <SuggestedActions append={append} chatId={chatId} disabled={disabled} />
        )}

      <input
        type="file"
        className="pointer-events-none fixed -left-4 -top-4 size-0.5 opacity-0"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
        disabled={disabled || isLoading}
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div className="flex flex-row items-end gap-2 overflow-x-scroll">
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}

          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: '',
                name: filename,
                contentType: '',
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}

      <Textarea
        ref={textareaRef}
        placeholder="Send a message..."
        value={input}
        onChange={handleInput}
        className={cx(
          'max-h-[calc(75dvh)] min-h-[24px] resize-none overflow-hidden rounded-2xl bg-muted pb-10 !text-base dark:border-zinc-700',
          className,
        )}
        rows={2}
        autoFocus
        aria-label="Message input area"
        aria-describedby="message-input-instructions"
        disabled={disabled || isLoading}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();

            if (isLoading) {
              toast.error('Please wait for the model to finish its response!');
            } else {
              submitForm();
            }
          } else if (
            event.key === 'Tab' &&
            attachments.length > 0 &&
            !event.shiftKey
          ) {
            // Allow tabbing to attachments
            event.preventDefault();
            const attachmentButton = document.querySelector(
              '[data-attachment-button]',
            );
            if (attachmentButton) {
              (attachmentButton as HTMLElement).focus();
            }
          }
        }}
      />
      <div className="sr-only" id="message-input-instructions">
        Type your message and press Enter to send. Use Shift+Enter for a new
        line.
      </div>

      <div className="absolute bottom-0 right-0 flex h-10 items-center justify-end gap-2 p-2">
        <AttachmentsButton fileInputRef={fileInputRef} isLoading={isLoading || !!disabled} />
        {isLoading ? (
          <StopButton stop={stop} setMessages={setMessages} disabled={disabled} />
        ) : (
          <SendButton
            submitForm={submitForm}
            input={input}
            uploadQueue={uploadQueue}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}

export const MultimodalInput = memo(PureMultimodalInput, (prev, next) => {
  if (
    prev.input !== next.input ||
    prev.isLoading !== next.isLoading ||
    prev.disabled !== next.disabled ||
    !equal(prev.attachments, next.attachments) ||
    prev.messages.length !== next.messages.length
  ) {
    return false;
  }
  return true;
});

function PureAttachmentsButton({
  fileInputRef,
  isLoading,
}: {
  fileInputRef: React.RefObject<HTMLInputElement> | null;
  isLoading: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="mr-1"
      aria-label="Attach files"
      onClick={() => fileInputRef?.current?.click()}
      disabled={isLoading}
    >
      <PaperclipIcon />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton, (prev, next) => {
  if (prev.isLoading !== next.isLoading) return false;
  return true;
});

function PureStopButton({
  stop,
  setMessages,
  disabled,
}: {
  stop: () => void;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full bg-black text-white hover:bg-black/90 dark:bg-muted dark:text-white/90 dark:hover:bg-zinc-800"
      onClick={(event) => {
        event.preventDefault();
        
        // Adding a spinning message to indicate we're stopping generation
        setMessages((messages) => {
          // Find the last assistant message and mark it as incomplete
          const lastAssistantMessageIndex = [...messages]
            .reverse()
            .findIndex((message) => message.role === 'assistant');
          
          if (lastAssistantMessageIndex >= 0) {
            const newMessages = [...messages];
            const actualIndex = messages.length - 1 - lastAssistantMessageIndex;
            
            // Mark the message as user-stopped
            newMessages[actualIndex] = {
              ...newMessages[actualIndex],
              content: newMessages[actualIndex].content + ' [Stopped by user]',
            };
            
            return newMessages;
          }
          
          return messages;
        });
        
        stop();
      }}
      aria-label="Stop generating"
      disabled={disabled}
    >
      <StopIcon />
    </Button>
  );
}

const StopButton = memo(PureStopButton, (prev, next) => {
  if (prev.disabled !== next.disabled) return false;
  return true;
});

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
  disabled,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={submitForm}
      disabled={
        disabled || 
        (!input.trim() && uploadQueue.length === 0 && !input.length)
      }
      size="icon"
      variant="ghost"
      className="rounded-full bg-black text-white hover:bg-black/90 dark:bg-muted dark:text-white/90 dark:hover:bg-zinc-800"
    >
      <ArrowUpIcon />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prev, next) => {
  if (prev.uploadQueue.length !== next.uploadQueue.length) return false;
  if (prev.input !== next.input) return false;
  if (prev.disabled !== next.disabled) return false;
  return true;
});
