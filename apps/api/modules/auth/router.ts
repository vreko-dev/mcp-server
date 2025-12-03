import { os } from "@orpc/server";

/**
 * Auth Router
 *
 * Handles authentication-related procedures:
 * - API key validation
 * - Usage tracking
 * - Session management
 *
 * Note: Device authorization endpoints are provided by Better Auth v1.3.34
 * and exposed via deviceAuth router at /api/device-auth/*
 */
export const authRouter = os.router({});
