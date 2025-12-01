import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW server for Node.js test environment
 * Used by Vitest to intercept network requests during tests
 */
export const server = setupServer(...handlers);
