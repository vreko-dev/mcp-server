import type { FileInput } from "@snapback-oss/contracts";
export declare class SnapshotNaming {
    /**
     * Generate snapshot name based on naming strategy
     */
    generateName(files: FileInput[], strategy?: "git" | "semantic" | "timestamp" | "custom"): string;
    /**
     * Git strategy - would parse git commit message (simplified implementation)
     */
    private gitStrategy;
    /**
     * Semantic strategy - analyze file operations
     */
    private semanticStrategy;
    /**
     * Timestamp strategy - use current timestamp
     */
    private timestampStrategy;
    /**
     * Capitalize first letter of string
     */
    private capitalize;
}
//# sourceMappingURL=SnapshotNaming.d.ts.map