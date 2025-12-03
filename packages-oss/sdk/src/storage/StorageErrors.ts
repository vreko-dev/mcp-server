export class StorageError extends Error {
	constructor(
		message: string,
		public code?: string,
		public details?: unknown,
	) {
		super(message);
		this.name = "StorageError";
	}
}

export class StorageConnectionError extends StorageError {
	constructor(message: string, details?: unknown) {
		super(message, "STORAGE_CONNECTION_ERROR", details);
		this.name = "StorageConnectionError";
	}
}

export class StorageTransactionError extends StorageError {
	constructor(message: string, details?: unknown) {
		super(message, "STORAGE_TRANSACTION_ERROR", details);
		this.name = "StorageTransactionError";
	}
}

export class StorageFullError extends StorageError {
	constructor(message: string, details?: unknown) {
		super(message, "STORAGE_FULL_ERROR", details);
		this.name = "StorageFullError";
	}
}

export class StorageLockError extends StorageError {
	constructor(message: string, details?: unknown) {
		super(message, "STORAGE_LOCK_ERROR", details);
		this.name = "StorageLockError";
	}
}

export class CorruptedDataError extends StorageError {
	constructor(message: string, details?: unknown) {
		super(message, "CORRUPTED_DATA_ERROR", details);
		this.name = "CorruptedDataError";
	}
}
