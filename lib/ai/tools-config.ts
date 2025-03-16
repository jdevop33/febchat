/**
 * AI Tools Configuration
 * 
 * This file configures all AI tools used by the application.
 * It exports a function to configure tools for specific AI models.
 */

import { Tool } from 'ai';

// Import all available tools
import { searchBylawsTool, bylawAnswersTool } from './tools';

// Define available tools for each model
type ToolsConfig = {
  [modelId: string]: Tool[];
};

// Register tools with models
export const toolsConfig: ToolsConfig = {
  // Oak Bay Bylaws - our primary mode
  'oak-bay-bylaws': [
    bylawAnswersTool, // Add this first for common bylaw questions
    searchBylawsTool, // More general search
  ],
  
  // Default tools for other models
  'chat-model-small': [
    bylawAnswersTool,
    searchBylawsTool,
  ],
  'chat-model-large': [
    bylawAnswersTool,
    searchBylawsTool,
  ],
};

/**
 * Get the appropriate tools for a given model
 */
export function getToolsForModel(modelId: string): Tool[] {
  // Return tools for the specified model, or an empty array if none defined
  return toolsConfig[modelId] || [];
}