import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.types";

/**
 * Server-side Supabase client for Next.js
 * Uses @supabase/ssr for proper cookie handling and session management
 *
 * Note: @supabase/ssr should be installed via: pnpm add @supabase/ssr
 * For now, using standard supabase-js client with service role key
 */

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
	throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createSupabaseClient<Database>(
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	},
);

/**
 * TODO: When @supabase/ssr is installed, replace above with:
 * import { createServerClient } from '@supabase/ssr';
 * import { cookies } from 'next/headers';
 *
 * export async function createClient() {
 *   const cookieStore = await cookies();
 *   return createServerClient<Database>(
 *     process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 *     {
 *       cookies: {
 *         getAll: () => cookieStore.getAll(),
 *         setAll: (cookiesToSet) => {
 *           cookiesToSet.forEach(({ name, value, options }) =>
 *             cookieStore.set(name, value, options)
 *           );
 *         },
 *       },
 *     }
 *   );
 * }
 */
