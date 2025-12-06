import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server.js";
import { NextResponse } from "next/server.js";
import type { Database } from "./types";

export async function updateSession(request: NextRequest) {
	let response = NextResponse.next({
		request: {
			headers: request.headers,
		},
	});

	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
		{
			cookies: {
				get(name: string) {
					return request.cookies.get(name)?.value;
				},
				set(name: string, value: string, options) {
					request.cookies.set({
						name,
						value,
						...options,
					});
					response = NextResponse.next({
						request: {
							headers: request.headers,
						},
					});
					response.cookies.set({
						name,
						value,
						...options,
					});
				},
				remove(name: string, options) {
					request.cookies.set({
						name,
						value: "",
						...options,
					});
					response = NextResponse.next({
						request: {
							headers: request.headers,
						},
					});
					response.cookies.set({
						name,
						value: "",
						...options,
					});
				},
			},
		},
	);

	await supabase.auth.getUser();

	return response;
}
