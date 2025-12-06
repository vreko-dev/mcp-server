import type { KyInstance } from "ky";
import type QuickLRU from "quick-lru";
export declare class ConfigClient {
	private http;
	private cache;
	constructor(http: KyInstance, cache: QuickLRU<string, unknown>);
	get(): Promise<Record<string, unknown>>;
	update(config: Record<string, unknown>): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=ConfigClient.d.ts.map
