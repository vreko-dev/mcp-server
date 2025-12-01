import { auth } from "@snapback/auth";

// Better Auth handler - delegates to the auth instance from @snapback/auth
// This handles all authentication routes like /api/auth/sign-in, /api/auth/get-session, etc.
export const GET = (req: Request) => auth.handler(req);
export const POST = (req: Request) => auth.handler(req);
