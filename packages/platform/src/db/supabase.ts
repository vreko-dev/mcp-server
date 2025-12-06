import { createClient } from "@supabase/supabase-js";
import type { Database } from "./schema/postgres";

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Validate that we have the required credentials
if (!supabaseUrl) {
	throw new Error("Missing SUPABASE_URL environment variable");
}

if (!supabaseKey) {
	throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable");
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true,
	},
	db: {
		schema: "public",
	},
	global: {
		headers: {
			"X-Client-Info": "snapback-db-client",
		},
	},
});

// Export types
export type SupabaseClient = typeof supabase;
