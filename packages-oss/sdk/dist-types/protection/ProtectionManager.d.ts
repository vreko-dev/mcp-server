import type { ProtectedFile, ProtectionConfig, ProtectionLevel } from "@snapback-oss/contracts";
export declare class ProtectionManager {
    private registry;
    private config;
    constructor(config: ProtectionConfig);
    protect(filePath: string, level: ProtectionLevel, reason?: string): void;
    unprotect(filePath: string): void;
    getProtection(filePath: string): ProtectedFile | null;
    isProtected(filePath: string): boolean;
    getLevel(filePath: string): ProtectionLevel | null;
    listProtected(): ProtectedFile[];
    updateLevel(filePath: string, level: ProtectionLevel): void;
    getConfig(): ProtectionConfig;
    updateConfig(config: ProtectionConfig): void;
}
//# sourceMappingURL=ProtectionManager.d.ts.map