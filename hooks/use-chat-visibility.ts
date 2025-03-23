'use client';

import { updateChatVisibility } from '@/app/(chat)/actions';
import type { VisibilityType } from '@/components/ui/visibility-selector';
import type { Chat } from '@/lib/db/schema';
import { useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';

export function useChatVisibility({
  chatId,
  initialVisibility,
}: {
  chatId: string;
  initialVisibility: VisibilityType;
}) {
  const { mutate } = useSWRConfig();

  // FIXED: Don't access cache directly, use useSWR with fallback
  const { data: history = [] } = useSWR<Array<Chat>>('/api/history', null, {
    fallbackData: [],
  });

  const { data: localVisibility, mutate: setLocalVisibility } = useSWR(
    `${chatId}-visibility`,
    null,
    {
      fallbackData: initialVisibility,
    },
  );

  const visibilityType = useMemo(() => {
    // Safely access history with fallback
    const safeHistory = history || [];
    const chat = safeHistory.find((chat) => chat.id === chatId);
    if (!chat) return localVisibility || 'private';
    return chat.visibility;
  }, [history, chatId, localVisibility]);

  const setVisibilityType = (updatedVisibilityType: VisibilityType) => {
    setLocalVisibility(updatedVisibilityType);

    // Safely update the history cache with error handling
    try {
      mutate<Array<Chat>>(
        '/api/history',
        (prevHistory) => {
          const safeHistory = prevHistory || [];
          return safeHistory.map((chat) => {
            if (chat.id === chatId) {
              return {
                ...chat,
                visibility: updatedVisibilityType,
              };
            }
            return chat;
          });
        },
        { revalidate: false },
      );

      // Server action to persist the change
      updateChatVisibility({
        chatId: chatId,
        visibility: updatedVisibilityType,
      }).catch((err) => {
        console.error('Failed to update chat visibility:', err);
      });
    } catch (error) {
      console.error('Error updating visibility in cache:', error);
    }
  };

  return { visibilityType, setVisibilityType };
}
