// Testing shared types for circular dependencies

/**
 * This script doesn't need to compile successfully - we're just checking if the
 * shared types approach would eliminate circular dependencies between components.
 *
 * The concept is to move common types to a shared location so that components
 * don't need to import from each other.
 *
 * Key parts of the solution:
 * 1. Creating a shared types directory with common interfaces
 * 2. Modifying artifact-types.ts to import from shared-types instead
 * 3. Modifying document-types.ts to import from shared-types instead
 * 4. Modifying message-types.ts to import from shared-types instead
 *
 * This breaks the circular dependency chain:
 * artifact -> message -> document -> artifact
 *
 * Now they all depend on shared-types, eliminating the circular references.
 */

console.log("Shared types approach for circular dependencies");
