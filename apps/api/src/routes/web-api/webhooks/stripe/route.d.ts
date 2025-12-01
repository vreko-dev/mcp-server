import type { NextRequest } from "next/server";
/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe subscription lifecycle events with full business logic
 */
export declare function POST(request: NextRequest): Promise<any>;
