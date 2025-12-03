import type { Snapshot, SnapshotFilters } from "@snapback-oss/contracts";
import type { KyInstance } from "ky";
import type QuickLRU from "quick-lru";
export declare class SnapshotClient {
	private http;
	private cache;
	constructor(http: KyInstance, cache: QuickLRU<string, unknown>);
	create(data: { filePath: string; content: string; message?: string; protected?: boolean }): Promise<Snapshot>;
	list(filters?: SnapshotFilters): Promise<Snapshot[]>;
	get(id: string): Promise<Snapshot>;
	delete(id: string): Promise<void>;
	restore(id: string): Promise<{
		success: boolean;
		restoredFiles: string[];
	}>;
	update(
		id: string,
		data: {
			message?: string;
			protected?: boolean;
		},
	): Promise<Snapshot>;
	/**
	 * Invalidate all snapshot list caches (including filtered lists)
	 */
	private invalidateListCache;
}
//# sourceMappingURL=SnapshotClient.d.ts.map
