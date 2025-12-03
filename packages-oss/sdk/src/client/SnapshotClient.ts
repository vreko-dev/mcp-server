import type { Snapshot, SnapshotFilters } from "@snapback-oss/contracts";
import type { KyInstance } from "ky";
import type QuickLRU from "quick-lru";

export class SnapshotClient {
	constructor(
		private http: KyInstance,
		private cache: QuickLRU<string, unknown>,
	) {}

	async create(data: {
		filePath: string;
		content: string;
		message?: string;
		protected?: boolean;
	}): Promise<Snapshot> {
		const response = await this.http
			.post("snapshots", {
				json: {
					filePath: data.filePath,
					content: data.content,
					message: data.message,
					protected: data.protected,
				},
			})
			.json<Snapshot>();

		// Invalidate all snapshot list caches (including filtered lists)
		this.invalidateListCache();

		return response;
	}

	async list(filters?: SnapshotFilters): Promise<Snapshot[]> {
		const cacheKey = `snapshots:list:${JSON.stringify(filters || {})}`;

		const cached = this.cache.get(cacheKey);
		if (cached) {
			return cached as Snapshot[];
		}

		// Filter out undefined values for searchParams
		const searchParams: Record<string, any> = {};
		if (filters) {
			Object.entries(filters).forEach(([key, value]) => {
				if (value !== undefined) {
					if (value instanceof Date) {
						// Serialize dates to ISO strings for portable HTTP transmission
						searchParams[key] = value.toISOString();
					} else {
						searchParams[key] = value;
					}
				}
			});
		}

		const response = await this.http
			.get("snapshots", {
				searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
			})
			.json<Snapshot[]>();

		this.cache.set(cacheKey, response);
		return response;
	}

	async get(id: string): Promise<Snapshot> {
		const cacheKey = `snapshot:${id}`;

		const cached = this.cache.get(cacheKey);
		if (cached) {
			return cached as Snapshot;
		}

		const response = await this.http.get(`snapshots/${id}`).json<Snapshot>();
		this.cache.set(cacheKey, response);
		return response;
	}

	async delete(id: string): Promise<void> {
		await this.http.delete(`snapshots/${id}`);

		// Invalidate cache
		this.cache.delete(`snapshot:${id}`);
		this.invalidateListCache();
	}

	async restore(id: string): Promise<{ success: boolean; restoredFiles: string[] }> {
		const response = await this.http
			.post(`snapshots/${id}/restore`)
			.json<{ success: boolean; restoredFiles: string[] }>();
		return response;
	}

	async update(
		id: string,
		data: {
			message?: string;
			protected?: boolean;
		},
	): Promise<Snapshot> {
		const response = await this.http
			.put(`snapshots/${id}`, {
				json: data,
			})
			.json<Snapshot>();

		// Invalidate cache
		this.cache.delete(`snapshot:${id}`);
		this.invalidateListCache();

		return response;
	}

	/**
	 * Invalidate all snapshot list caches (including filtered lists)
	 */
	private invalidateListCache(): void {
		// Iterate through all cache keys and delete those starting with "snapshots:list"
		for (const key of this.cache.keys()) {
			if (key.startsWith("snapshots:list")) {
				this.cache.delete(key);
			}
		}
	}
}
