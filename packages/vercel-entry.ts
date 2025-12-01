// Import directly from the API package source
import { app } from "./api/index.js";

export default app;

// Vercel requires a named export for the fetch function
export const fetch = app.fetch;
