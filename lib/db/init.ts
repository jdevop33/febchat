/**
 * Database initialization module
 * 
 * This module is now deprecated in favor of the unified approach in index.ts.
 * It is kept for backwards compatibility but redirects to index.ts.
 */

import db from './index';
export default db;

// Re-export schema for compatibility
export * from './schema';