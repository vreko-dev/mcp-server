import { setupServer } from "msw/node";
import { oauthHandlers } from "./handlers/oauth";

/**
 * MSW Server Setup
 *
 * This sets up Mock Service Worker for Node.js environments (Vitest, Jest).
 * It intercepts network requests during tests and returns mock responses.
 *
 * The server is started in vitest.setup.ts with proper lifecycle management:
 * - beforeAll: server.listen({ onUnhandledRequest: 'error' })
 * - afterEach: server.resetHandlers()
 * - afterAll: server.close()
 */

export const server = setupServer(...oauthHandlers);
