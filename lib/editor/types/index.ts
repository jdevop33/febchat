import type { Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Node } from 'prosemirror-model';
import type { MutableRefObject } from 'react';

export interface HandleTransactionParams {
  transaction: Transaction;
  editorRef: MutableRefObject<EditorView | null>;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
}

export type BuildContentFromDocumentFn = (document: Node) => string;
export type BuildDocumentFromContentFn = (content: string) => Node;

// UI Suggestion with all required properties
export interface UISuggestion {
  id: string;
  selectionStart: number;
  selectionEnd: number;
  description: string;
  suggestedText: string;
  originalText: string;
  type?: string;
  metadata?: Record<string, any>;
}