import { type FeatureFlag } from ".";
export declare class FeatureManager {
    private static instance;
    private flags;
    private constructor();
    static getInstance(): FeatureManager;
    isEnabled(flag: FeatureFlag): boolean;
    getValue<T>(flag: FeatureFlag): T | undefined;
    setFlag(flag: FeatureFlag, value: boolean | number): void;
    private loadEnvironmentOverrides;
    reset(): void;
}
