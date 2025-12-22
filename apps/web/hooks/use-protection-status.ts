"use client";

import { logger } from "@snapback/infrastructure";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type ProtectionStatus = "protected" | "unprotected" | "loading" | "error";

interface UseProtectionStatusOptions {
	fileId: string;
	onStatusChange?: (status: ProtectionStatus) => void;
	fallbackToPolling?: boolean;
}

interface UseProtectionStatusReturn {
	status: ProtectionStatus;
	isRealtime: boolean;
	channel: RealtimeChannel | null;
	refetch: () => Promise<void>;
}

export function useProtectionStatus({
	fileId,
	onStatusChange,
	fallbackToPolling = true,
}: UseProtectionStatusOptions): UseProtectionStatusReturn {
	const [status, setStatus] = useState<ProtectionStatus>("loading");
	const [channel, setChannel] = useState<RealtimeChannel | null>(null);
	const [isRealtime, setIsRealtime] = useState(true);
	const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

	// Initial fetch
	const fetchStatus = useCallback(async () => {
		if (!fileId || fileId.trim() === "") {
			setStatus("loading");
			return;
		}

		try {
			const { data, error } = await supabase
				.from("protected_files")
				.select("protection")
				.eq("id", fileId)
				.order("created_at", { ascending: false })
				.limit(1)
				.single();

			// Handle "no rows" error (PGRST116)
			if (error && error.code === "PGRST116") {
				setStatus("unprotected");
				onStatusChange?.("unprotected");
				return;
			}

			if (error) {
				throw error;
			}

			const newStatus: ProtectionStatus = data?.protection === "enabled" ? "protected" : "unprotected";

			setStatus(newStatus);
			onStatusChange?.(newStatus);
		} catch (err) {
			console.error("Failed to fetch protection status:", err);
			setStatus("error");
			onStatusChange?.("error");
		}
	}, [fileId, onStatusChange]);

	// Setup polling fallback
	const setupPolling = useCallback(() => {
		const interval = setInterval(() => {
			fetchStatus();
		}, 5000); // Poll every 5 seconds

		setPollingInterval(interval);
		return interval;
	}, [fetchStatus]);

	// Real-time subscription
	useEffect(() => {
		if (!fileId || fileId.trim() === "") {
			setStatus("loading");
			return;
		}

		// Initial fetch
		fetchStatus();

		// Try real-time subscription
		const chan: RealtimeChannel = supabase
			.channel(`protection:${fileId}`, {
				config: {
					broadcast: { self: false },
				},
			})
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "protected_files",
					filter: `id=eq.${fileId}`,
				},
				(payload) => {
					if (payload.new && "protection" in payload.new) {
						const newStatus: ProtectionStatus =
							payload.new.protection === "enabled" ? "protected" : "unprotected";
						setStatus(newStatus);
						onStatusChange?.(newStatus);
					}
				},
			)
			.subscribe((subscriptionStatus) => {
				if (subscriptionStatus === "SUBSCRIBED") {
					logger.info("Connected to real-time protection updates");
					setIsRealtime(true);
				} else if (subscriptionStatus === "CHANNEL_ERROR") {
					setIsRealtime(false);
					if (fallbackToPolling) {
						setupPolling();
					}
				}
			});

		setChannel(chan);

		return () => {
			// Cleanup real-time
			supabase.removeChannel(chan);

			// Cleanup polling
			if (pollingInterval) {
				clearInterval(pollingInterval);
				setPollingInterval(null);
			}
		};
	}, [fileId, fetchStatus, fallbackToPolling, setupPolling, pollingInterval, onStatusChange]);

	return {
		status,
		isRealtime,
		channel,
		refetch: fetchStatus,
	};
}
