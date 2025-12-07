export declare class StorageError extends Error {
    code?: string | undefined;
    details?: unknown;
    constructor(message: string, code?: string | undefined, details?: unknown);
}
export declare class StorageConnectionError extends StorageError {
    constructor(message: string, details?: unknown);
}
export declare class StorageTransactionError extends StorageError {
    constructor(message: string, details?: unknown);
}
export declare class StorageFullError extends StorageError {
    constructor(message: string, details?: unknown);
}
export declare class StorageLockError extends StorageError {
    constructor(message: string, details?: unknown);
}
export declare class CorruptedDataError extends StorageError {
    constructor(message: string, details?: unknown);
}
//# sourceMappingURL=StorageErrors.d.ts.map