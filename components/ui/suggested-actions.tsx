'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { memo } from 'react';

interface SuggestedActionsProps {
  chatId: string;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  disabled?: boolean;
}

function PureSuggestedActions({ chatId, append, disabled }: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'What are the rules',
      label: 'for tree removal in Oak Bay?',
      action: 'What are the regulations for tree removal in Oak Bay?',
    },
    {
      title: 'Tell me about',
      label: 'noise restrictions in Oak Bay',
      action: 'What are the noise restrictions in Oak Bay?',
    },
    {
      title: 'Can I keep chickens',
      label: 'in my backyard in Oak Bay?',
      action: 'Can I keep chickens in my backyard in Oak Bay?',
    },
    {
      title: 'What permits do I need',
      label: 'for home renovations?',
      action: 'What permits do I need for home renovations in Oak Bay?',
    },
  ];

  return (
    <div className="grid w-full gap-2 sm:grid-cols-2">
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              if (disabled) return;
              
              window.history.replaceState({}, '', `/chat/${chatId}`);

              append({
                role: 'user',
                content: suggestedAction.action,
              });
            }}
            disabled={disabled}
            className="h-auto w-full flex-1 items-start justify-start gap-1 rounded-xl border bg-background px-4 py-3.5 text-left text-sm sm:flex-col"
          >
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
