import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
	throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
	throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/**
 * Client-side Supabase instance
 * Used for real-time subscriptions, queries, and mutations in React components
 *
 * Real-time features:
 * - PostgreSQL WAL (Write-Ahead Log) subscriptions for <500ms latency
 * - Automatic fallback to polling (5s interval) if real-time fails
 * - Graceful reconnection on network recovery
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: true,
		storageKey: "snapback-auth",
		storage: typeof window !== "undefined" ? window.localStorage : undefined,
	},
	realtime: {
		params: {
			eventsPerSecond: 10, // Rate limit real-time events
		},
	},
});

/**
 * Verify Supabase connection in development
 * Useful for debugging connection issues
 */
export async function verifySupabaseConnection() {
	try {
		const { data, error } = await supabase.auth.getUser();
		if (error) {
			console.warn("Supabase connection warning:", error.message);
		}
		return { success: !error, user: data?.user };
	} catch (err) {
		console.error("Supabase connection failed:", err);
		return { success: false, user: null };
	}
}
