'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface FileProtectionStatus {
	id: string;
	protection: 'enabled' | 'disabled';
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
	fileIds: string[]
): UseBulkProtectionStatusReturn {
	const [statuses, setStatuses] = useState<Map<string, FileProtectionStatus>>(
		new Map()
	);
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
					.from('protected_files')
					.select('id, protection, updated_at')
					.in('id', fileIds);

				if (error) {
					console.error('Failed to fetch bulk protection statuses:', error);
					setIsLoading(false);
					return;
				}

				const statusMap = new Map(
					data?.map((item) => [
						item.id,
						{
							id: item.id,
							protection: item.protection as 'enabled' | 'disabled',
							updatedAt: item.updated_at,
						},
					]) ?? []
				);

				setStatuses(statusMap);
				setIsLoading(false);
			} catch (error) {
				console.error('Failed to fetch bulk protection statuses:', error);
				setIsLoading(false);
			}
		};

		fetchAll();

		// Subscribe to all file changes
		const chan = supabase
			.channel('bulk_protection_changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'protected_files',
				},
				(payload) => {
					// Update if file is in our watched list
					if (payload.new && 'id' in payload.new && fileIds.includes(payload.new.id)) {
						setStatuses((prev) => {
							const updated = new Map(prev);
							updated.set(payload.new.id, {
								id: payload.new.id,
								protection: payload.new.protection,
								updatedAt: payload.new.updated_at,
							});
							return updated;
						});
					}
				}
			)
			.subscribe();

		setChannel(chan);

		return () => {
			supabase.removeChannel(chan);
		};
	}, [fileIds.join(',')]);

	return { statuses, isLoading, channel };
}
