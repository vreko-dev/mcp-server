"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface FileProtectionStatus {
	id: string;
	protection: "enabled" | "disabled";
	updatedAt: string;
}

interface UseBulkProtectionStatusReturn {
	statuses: Map<string, FileProtectionStatus>;
	isLoading: boolean;
	channel: RealtimeChannel | null;
}

/**
 * Watch multiple files' protection statuses in real-time
 * Efficiently tracks updates for collections of files
 *
 * Uses Supabase Realtime for instant updates (<500ms) with fallback awareness
 */
export function useBulkProtectionStatus(
	fileIds: string[],
	onChange?: (fileId: string, protection: "enabled" | "disabled") => void,
): UseBulkProtectionStatusReturn {
	const [statuses, setStatuses] = useState<Map<string, FileProtectionStatus>>(new Map());
	const [isLoading, setIsLoading] = useState(fileIds.length > 0);
	const [channel, setChannel] = useState<RealtimeChannel | null>(null);

	useEffect(() => {
		if (fileIds.length === 0) {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);

		// Initial fetch
		const fetchAll = async () => {
			try {
				const { data, error } = await supabase
					.from("protected_files")
					.select("id, protection, updated_at")
					.in("id", fileIds);

				if (error) {
					console.error("Failed to fetch bulk protection statuses:", error);
					setIsLoading(false);
					return;
				}

				const statusMap = new Map<string, FileProtectionStatus>(
					data?.map((item: any) => [
						item.id,
						{
							id: item.id,
							protection: item.protection as "enabled" | "disabled",
							updatedAt: item.updated_at,
						},
					]) ?? [],
				);

				setStatuses(statusMap);
				setIsLoading(false);
			} catch (error) {
				console.error("Failed to fetch bulk protection statuses:", error);
				setIsLoading(false);
			}
		};

		fetchAll();

		// Subscribe to all file changes
		const chan = supabase
			.channel("bulk_protection_changes")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "protected_files",
				},
				(payload: any) => {
					// Update if file is in our watched list
					if (payload.new && "id" in payload.new && fileIds.includes(payload.new.id)) {
						const newProtection = payload.new.protection as "enabled" | "disabled";
						setStatuses((prev: Map<string, FileProtectionStatus>) => {
							const updated = new Map(prev);
							updated.set(payload.new.id, {
								id: payload.new.id,
								protection: newProtection,
								updatedAt: payload.new.updated_at,
							});
							return updated;
						});
						// Call onChange callback if provided
						if (onChange) {
							onChange(payload.new.id, newProtection);
						}
					}
				},
			)
			.subscribe();

		setChannel(chan);

		return () => {
			supabase.removeChannel(chan);
		};
	}, [fileIds.join(",")]);

	return { statuses, isLoading, channel };
}
