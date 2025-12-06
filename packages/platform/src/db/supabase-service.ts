import { createClient } from "@supabase/supabase-js";
import { handleSupabaseError, safeSupabaseOperation, supabaseConnectionManager } from "./supabase-error-handler";
import type { Database } from "./types";

// Types for Supabase configuration
interface SupabaseConfig {
	supabaseUrl: string;
	supabaseKey: string;
}

// Validate and get Supabase configuration from environment variables
const getSupabaseConfig = (): SupabaseConfig | null => {
	const supabaseUrl =
		process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
	const supabaseKey =
		process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		return null;
	}

	return {
		supabaseUrl,
		supabaseKey,
	};
};

// Create Supabase client with optimized configuration for Vite
export const createSupabaseClient = () => {
	const config = getSupabaseConfig();

	if (!config) {
		throw new Error(
			"Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL/VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY environment variables.",
		);
	}

	return createClient<Database>(config.supabaseUrl, config.supabaseKey, {
		auth: {
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: true,
			flowType: "pkce", // Better for Vite/SPA applications
		},
		db: {
			schema: "public",
		},
		global: {
			headers: {
				"X-Client-Info": "snapback-vite-client",
			},
		},
	});
};

// Lazy initialization - client only created when accessed
let _supabase: ReturnType<typeof createClient<Database>> | null = null;

// Export the Supabase client instance with lazy initialization
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
	get(_target, prop) {
		if (!_supabase) {
			_supabase = createSupabaseClient();
		}
		return Reflect.get(_supabase, prop);
	},
});

// Connection health check
export const checkSupabaseConnection = async (): Promise<boolean> => {
	return await supabaseConnectionManager.testConnection(supabase);
};

// Safe database operations
export const safeSelect = async <T>(operation: () => Promise<T>) => {
	return await safeSupabaseOperation(operation, { maxRetries: 2 });
};

export const safeInsert = async <T>(operation: () => Promise<T>) => {
	return await safeSupabaseOperation(operation, { maxRetries: 1 });
};

export const safeUpdate = async <T>(operation: () => Promise<T>) => {
	return await safeSupabaseOperation(operation, { maxRetries: 1 });
};

export const safeDelete = async <T>(operation: () => Promise<T>) => {
	return await safeSupabaseOperation(operation, { maxRetries: 1 });
};

// Export types
export type SupabaseClient = typeof supabase;
export type { Database };
export { handleSupabaseError };
