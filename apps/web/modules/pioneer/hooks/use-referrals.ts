"use client";

import { useEffect, useState } from "react";
import { fetchReferrals, type ReferralStats } from "../lib/api-mock";

export function useReferrals() {
	const [data, setData] = useState<ReferralStats | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let mounted = true;

		async function load() {
			try {
				const result = await fetchReferrals();
				if (mounted) setData(result);
			} catch (err) {
				if (mounted) setError(err instanceof Error ? err : new Error("Failed to load referrals"));
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
