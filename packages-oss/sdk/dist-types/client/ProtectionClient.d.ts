import type { ProtectedFile, ProtectionLevel } from "@snapback-oss/contracts";
import type { KyInstance } from "ky";
import type QuickLRU from "quick-lru";
export declare class ProtectionClient {
	private http;
	private cache;
	constructor(http: KyInstance, cache: QuickLRU<string, unknown>);
	protect(path: string, level: ProtectionLevel, reason?: string): Promise<ProtectedFile>;
	unprotect(path: string): Promise<void>;
	get(path: string): Promise<ProtectedFile | null>;
	list(filters?: { level?: ProtectionLevel }): Promise<ProtectedFile[]>;
	update(path: string, level: ProtectionLevel, reason?: string): Promise<ProtectedFile>;
	/**
	 * Invalidate all protection list caches (including filtered lists)
	 */
	private invalidateListCache;
}
//# sourceMappingURL=ProtectionClient.d.ts.map
