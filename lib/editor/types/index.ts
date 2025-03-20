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

// Re-export from suggestions.tsx if needed
export interface UISuggestion {
  id: string;
  selectionStart: number;
  selectionEnd: number;
  // Add other properties as needed
}