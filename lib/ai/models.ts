/**
 * AI model configuration
 * 
 * This file provides configuration for AI models used in the application.
 * We use a direct API approach rather than the AI SDK to avoid version conflicts.
 */

// Model ID for Claude
export const MODEL_ID = 'claude-3-sonnet-20240229';
export const DEFAULT_CHAT_MODEL = 'oak-bay-bylaws';

// Environment check
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('WARNING: Missing ANTHROPIC_API_KEY environment variable');
}

/**
 * Custom provider for AI models
 */
export const myProvider = {
  languageModel: (modelName: string) => {
    return {
      name: modelName,
      model: MODEL_ID,
      provider: 'anthropic'
    };
  },
  imageModel: (modelName: string) => {
    return {
      name: modelName,
      model: 'claude-3-sonnet-20240229',
      provider: 'anthropic'
    };
  }
};

/**
 * Direct API helper for Anthropic
 */
export const callAnthropic = async (messages: any[], system: string, options = {}) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages,
      system,
      temperature: 0.5,
      max_tokens: 4000,
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  return await response.json();
};
