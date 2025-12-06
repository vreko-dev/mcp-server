// Import directly from the API application source
import { app } from "../apps/api/src/server";

export default app;

// Vercel requires a named export for the fetch function
export const fetch = app.fetch;
