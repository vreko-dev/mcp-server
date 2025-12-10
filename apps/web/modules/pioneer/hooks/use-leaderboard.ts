"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "../lib/api-mock";
import { fetchLeaderboard } from "../lib/api-mock";

export function useLeaderboard(limit = 10) {
	const [data, setData] = useState<{ leaderboard: LeaderboardEntry[]; total: number } | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let mounted = true;

		async function load() {
			try {
				const result = await fetchLeaderboard(limit);
				if (mounted) setData(result);
			} catch (err) {
				if (mounted) setError(err instanceof Error ? err : new Error("Failed to load leaderboard"));
			} finally {
				if (mounted) setIsLoading(false);
			}
		}

		load();

		return () => {
			mounted = false;
		};
	}, [limit]);

	return { data, isLoading, error };
}
