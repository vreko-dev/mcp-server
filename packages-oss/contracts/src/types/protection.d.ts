import { z } from "zod";
/**
 * Protection levels for files
 * - watch: Silent auto-snapshot on save (green)
 * - warn: Show notification before save (yellow/orange)
 * - block: Require explicit snapshot or override (red)
 */
export declare const ProtectionLevelSchema: z.ZodEnum<{
    warn: "warn";
    watch: "watch";
    block: "block";
}>;
export type ProtectionLevel = z.infer<typeof ProtectionLevelSchema>;
export type LegacyProtectionLevel = "Watched" | "Warning" | "Protected";
/**
 * UI metadata for protection levels
 */
export declare const ProtectionLevelMetadataSchema: z.ZodObject<{
    level: z.ZodEnum<{
        warn: "warn";
        watch: "watch";
        block: "block";
    }>;
    icon: z.ZodString;
    label: z.ZodString;
    description: z.ZodString;
    color: z.ZodString;
    themeColor: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ProtectionLevelMetadata = z.infer<typeof ProtectionLevelMetadataSchema>;
/**
 * Protection level configurations with UI metadata
 */
export declare const PROTECTION_LEVELS: Record<ProtectionLevel, ProtectionLevelMetadata>;
/**
 * Protected file entry
 */
export declare const ProtectedFileSchema: z.ZodObject<{
    path: z.ZodString;
    level: z.ZodEnum<{
        warn: "warn";
        watch: "watch";
        block: "block";
    }>;
    reason: z.ZodOptional<z.ZodString>;
    addedAt: z.ZodDate;
    pattern: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ProtectedFile = z.infer<typeof ProtectedFileSchema>;
/**
 * Pattern rule for automatic protection
 */
export declare const PatternRuleSchema: z.ZodObject<{
    pattern: z.ZodString;
    level: z.ZodEnum<{
        warn: "warn";
        watch: "watch";
        block: "block";
    }>;
    reason: z.ZodOptional<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type PatternRule = z.infer<typeof PatternRuleSchema>;
/**
 * Protection configuration
 */
export declare const ProtectionConfigSchema: z.ZodObject<{
    patterns: z.ZodDefault<z.ZodArray<z.ZodObject<{
        pattern: z.ZodString;
        level: z.ZodEnum<{
            warn: "warn";
            watch: "watch";
            block: "block";
        }>;
        reason: z.ZodOptional<z.ZodString>;
        enabled: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>;
    defaultLevel: z.ZodDefault<z.ZodEnum<{
        warn: "warn";
        watch: "watch";
        block: "block";
    }>>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    autoProtectConfigs: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type ProtectionConfig = z.infer<typeof ProtectionConfigSchema>;
/**
 * Protection manager options
 */
export declare const ProtectionManagerOptionsSchema: z.ZodObject<{
    config: z.ZodOptional<z.ZodObject<{
        patterns: z.ZodDefault<z.ZodArray<z.ZodObject<{
            pattern: z.ZodString;
            level: z.ZodEnum<{
                warn: "warn";
                watch: "watch";
                block: "block";
            }>;
            reason: z.ZodOptional<z.ZodString>;
            enabled: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>>;
        defaultLevel: z.ZodDefault<z.ZodEnum<{
            warn: "warn";
            watch: "watch";
            block: "block";
        }>>;
        enabled: z.ZodDefault<z.ZodBoolean>;
        autoProtectConfigs: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    persistRegistry: z.ZodDefault<z.ZodBoolean>;
    registryPath: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ProtectionManagerOptions = z.infer<typeof ProtectionManagerOptionsSchema>;
/**
 * Protection check result
 */
export declare const ProtectionCheckResultSchema: z.ZodObject<{
    isProtected: z.ZodBoolean;
    level: z.ZodOptional<z.ZodEnum<{
        warn: "warn";
        watch: "watch";
        block: "block";
    }>>;
    reason: z.ZodOptional<z.ZodString>;
    file: z.ZodOptional<z.ZodObject<{
        path: z.ZodString;
        level: z.ZodEnum<{
            warn: "warn";
            watch: "watch";
            block: "block";
        }>;
        reason: z.ZodOptional<z.ZodString>;
        addedAt: z.ZodDate;
        pattern: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ProtectionCheckResult = z.infer<typeof ProtectionCheckResultSchema>;
