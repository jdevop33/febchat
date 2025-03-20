'use client';

import { defaultMarkdownSerializer } from 'prosemirror-markdown';
import { DOMParser } from 'prosemirror-model';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { renderToString } from 'react-dom/server';

import { Markdown } from '@/components/markdown';
import { documentSchema } from '../config/constants';
import type { HandleTransactionParams, UISuggestion } from '../types';
import { createSuggestionWidget } from '../suggestions';

export const buildDocumentFromContent = (content: string) => {
  const parser = DOMParser.fromSchema(documentSchema);
  const stringFromMarkdown = renderToString(<Markdown>{content}</Markdown>);
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = stringFromMarkdown;
  return parser.parse(tempContainer);
};

export const buildContentFromDocument = (document: any) => {
  return defaultMarkdownSerializer.serialize(document);
};

export const handleTransaction = ({
  transaction,
  editorRef,
  onSaveContent,
}: HandleTransactionParams) => {
  if (!editorRef || !editorRef.current) return;

  const newState = editorRef.current.state.apply(transaction);
  editorRef.current.updateState(newState);

  if (transaction.docChanged && !transaction.getMeta('no-save')) {
    const updatedContent = buildContentFromDocument(newState.doc);

    if (transaction.getMeta('no-debounce')) {
      onSaveContent(updatedContent, false);
    } else {
      onSaveContent(updatedContent, true);
    }
  }
};

export const createDecorations = (
  suggestions: Array<UISuggestion>,
  view: any,
) => {
  const decorations: Array<Decoration> = [];

  for (const suggestion of suggestions) {
    decorations.push(
      Decoration.inline(
        suggestion.selectionStart,
        suggestion.selectionEnd,
        {
          class: 'suggestion-highlight',
        },
        {
          suggestionId: suggestion.id,
          type: 'highlight',
        },
      ),
    );

    decorations.push(
      Decoration.widget(
        suggestion.selectionStart,
        (view) => {
          const { dom } = createSuggestionWidget(suggestion, view);
          return dom;
        },
        {
          suggestionId: suggestion.id,
          type: 'widget',
        },
      ),
    );
  }

  return DecorationSet.create(view.state.doc, decorations);
};