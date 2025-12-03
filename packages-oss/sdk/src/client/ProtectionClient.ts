import type { ProtectedFile, ProtectionLevel } from "@snapback-oss/contracts";
import type { KyInstance } from "ky";
import type QuickLRU from "quick-lru";

export class ProtectionClient {
	constructor(
		private http: KyInstance,
		private cache: QuickLRU<string, unknown>,
	) {}

	async protect(path: string, level: ProtectionLevel, reason?: string): Promise<ProtectedFile> {
		const response = await this.http
			.post("protection", {
				json: { path, level, reason },
			})
			.json<ProtectedFile>();

		// Invalidate cache
		this.cache.delete(`protection:${path}`);
		this.invalidateListCache();

		return response;
	}

	async unprotect(path: string): Promise<void> {
		await this.http.delete("protection", {
			json: { path },
		});

		// Invalidate cache
		this.cache.delete(`protection:${path}`);
		this.invalidateListCache();
	}

	async get(path: string): Promise<ProtectedFile | null> {
		const cacheKey = `protection:${path}`;

		const cached = this.cache.get(cacheKey);
		// Check if cached value exists (not just truthy check)
		if (cached !== undefined) {
			// Use special sentinel value for cached 404s
			return cached === null ? null : (cached as ProtectedFile);
		}

		try {
			const response = await this.http
				.get("protection", {
					searchParams: { path },
				})
				.json<ProtectedFile>();
			this.cache.set(cacheKey, response);
			return response;
		} catch (error) {
			// If 404, cache null to prevent repeated API calls
			if ((error as any).response?.status === 404) {
				this.cache.set(cacheKey, null);
				return null;
			}
			throw error;
		}
	}

	async list(filters?: { level?: ProtectionLevel }): Promise<ProtectedFile[]> {
		const cacheKey = `protection:list:${JSON.stringify(filters || {})}`;

		const cached = this.cache.get(cacheKey);
		if (cached) {
			return cached as ProtectedFile[];
		}

		// Filter out undefined values for searchParams
		const searchParams: Record<string, string> = {};
		if (filters?.level) {
			searchParams.level = String(filters.level);
		}

		const response = await this.http
			.get("protection/list", {
				searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
			})
			.json<ProtectedFile[]>();

		this.cache.set(cacheKey, response);
		return response;
	}

	async update(path: string, level: ProtectionLevel, reason?: string): Promise<ProtectedFile> {
		const response = await this.http
			.put("protection", {
				json: { path, level, reason },
			})
			.json<ProtectedFile>();

		// Invalidate cache
		this.cache.delete(`protection:${path}`);
		this.invalidateListCache();

		return response;
	}

	/**
	 * Invalidate all protection list caches (including filtered lists)
	 */
	private invalidateListCache(): void {
		// Iterate through all cache keys and delete those starting with "protection:list"
		for (const key of this.cache.keys()) {
			if (key.startsWith("protection:list")) {
				this.cache.delete(key);
			}
		}
	}
}
