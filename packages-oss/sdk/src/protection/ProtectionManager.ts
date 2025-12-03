import type { ProtectedFile, ProtectionConfig, ProtectionLevel } from "@snapback-oss/contracts";
import { minimatch } from "minimatch";

export class ProtectionManager {
	private registry = new Map<string, ProtectedFile>();
	private config: ProtectionConfig;

	constructor(config: ProtectionConfig) {
		this.config = config;
	}

	protect(filePath: string, level: ProtectionLevel, reason?: string): void {
		const protectedFile: ProtectedFile = {
			path: filePath,
			level,
			reason,
			addedAt: new Date(),
		};

		this.registry.set(filePath, protectedFile);
	}

	unprotect(filePath: string): void {
		this.registry.delete(filePath);
	}

	getProtection(filePath: string): ProtectedFile | null {
		// Check for direct protection first
		const directProtection = this.registry.get(filePath);
		if (directProtection) {
			return directProtection;
		}

		// Check pattern-based protection if enabled
		if (!this.config.enabled) {
			return null;
		}

		// Check each pattern rule
		for (const rule of this.config.patterns) {
			if (!rule.enabled) {
				continue;
			}

			if (minimatch(filePath, rule.pattern)) {
				return {
					path: filePath,
					level: rule.level,
					reason: rule.reason || `Matches pattern: ${rule.pattern}`,
					addedAt: new Date(),
					pattern: rule.pattern,
				};
			}
		}

		return null;
	}

	isProtected(filePath: string): boolean {
		return this.getProtection(filePath) !== null;
	}

	getLevel(filePath: string): ProtectionLevel | null {
		const protection = this.getProtection(filePath);
		return protection ? protection.level : null;
	}

	listProtected(): ProtectedFile[] {
		return Array.from(this.registry.values());
	}

	updateLevel(filePath: string, level: ProtectionLevel): void {
		const existing = this.registry.get(filePath);
		if (!existing) {
			throw new Error(`File ${filePath} is not protected`);
		}

		this.registry.set(filePath, {
			...existing,
			level,
		});
	}

	getConfig(): ProtectionConfig {
		return { ...this.config };
	}

	updateConfig(config: ProtectionConfig): void {
		this.config = { ...this.config, ...config };
	}
}
