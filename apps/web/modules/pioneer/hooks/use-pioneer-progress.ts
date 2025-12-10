"use client";

import { useEffect, useState } from "react";
import type { PioneerProgress } from "../lib/api-mock";
import { fetchPioneerProgress } from "../lib/api-mock";

export function usePioneerProgress() {
	const [data, setData] = useState<PioneerProgress | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// In real app, get user ID from auth context
	// For mock, we assume "logged in" if we pass a dummy ID
	const userId = "mock_user_id";

	useEffect(() => {
		let mounted = true;

		async function load() {
			try {
				const result = await fetchPioneerProgress(userId);
				if (mounted) setData(result);
			} catch (err) {
				if (mounted) setError(err instanceof Error ? err : new Error("Failed to load pioneer progress"));
			} finally {
				if (mounted) setIsLoading(false);
			}
		}

		load();

		return () => {
			mounted = false;
		};
	}, []);

	return { data, isLoading, error };
}
