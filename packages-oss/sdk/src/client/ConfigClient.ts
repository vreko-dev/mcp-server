import type { KyInstance } from "ky";
import type QuickLRU from "quick-lru";

export class ConfigClient {
	constructor(
		private http: KyInstance,
		private cache: QuickLRU<string, unknown>,
	) {}

	async get(): Promise<Record<string, unknown>> {
		const cacheKey = "config";

		const cached = this.cache.get(cacheKey);
		if (cached) {
			return cached as Record<string, unknown>;
		}

		const response = await this.http.get("config").json<Record<string, unknown>>();
		this.cache.set(cacheKey, response);
		return response;
	}

	async update(config: Record<string, unknown>): Promise<Record<string, unknown>> {
		const response = await this.http
			.put("config", {
				json: config,
			})
			.json<Record<string, unknown>>();

		// Invalidate cache
		this.cache.delete("config");

		return response;
	}
}
