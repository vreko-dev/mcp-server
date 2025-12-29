"use client";

/**
 * Backup Queue with IndexedDB persistence
 *
 * Per /apps/onboarding/implementation.md Phase 5:
 * - Network interruption queue (local IndexedDB)
 * - Retry with exponential backoff
 * - Deduplication of same-file backups
 *
 * Per /apps/onboarding/mcp_broker.md:
 * - Queue backup in local IndexedDB when network fails
 * - Retry queued backups when network restored
 */

export interface QueuedBackup {
	id: string;
	filePath: string;
	content: string;
	language: string;
	createdAt: number;
	attempts: number;
	nextRetry: number;
	status: "pending" | "processing" | "failed";
}

export interface BackupQueueConfig {
	dbName?: string;
	storeName?: string;
	maxRetries?: number;
	onFlush?: (backup: QueuedBackup) => Promise<boolean>;
}

export interface BackupQueue {
	add(backup: Omit<QueuedBackup, "id" | "createdAt" | "attempts" | "nextRetry" | "status">): Promise<void>;
	getPending(): Promise<QueuedBackup[]>;
	flush(): Promise<void>;
	remove(id: string): Promise<void>;
	clear(): Promise<void>;
}

const DB_NAME = "snapback_backup_queue";
const STORE_NAME = "backups";
const DB_VERSION = 1;

/**
 * Open IndexedDB connection
 */
function openDB(dbName: string, storeName: string): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === "undefined") {
			reject(new Error("IndexedDB not available"));
			return;
		}

		const request = indexedDB.open(dbName, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(storeName)) {
				const store = db.createObjectStore(storeName, { keyPath: "id" });
				store.createIndex("filePath", "filePath", { unique: false });
				store.createIndex("status", "status", { unique: false });
				store.createIndex("nextRetry", "nextRetry", { unique: false });
			}
		};
	});
}

/**
 * Create a backup queue with IndexedDB persistence
 */
export function createBackupQueue(config: BackupQueueConfig = {}): BackupQueue {
	const dbName = config.dbName ?? DB_NAME;
	const storeName = config.storeName ?? STORE_NAME;
	const maxRetries = config.maxRetries ?? 5;
	let isListening = false;

	/**
	 * Calculate next retry time with exponential backoff
	 */
	function getNextRetryTime(attempts: number): number {
		const baseDelay = 1000; // 1 second
		const delay = baseDelay * 2 ** attempts;
		const maxDelay = 5 * 60 * 1000; // 5 minutes
		return Date.now() + Math.min(delay, maxDelay);
	}

	/**
	 * Add a backup to the queue
	 */
	async function add(
		backup: Omit<QueuedBackup, "id" | "createdAt" | "attempts" | "nextRetry" | "status">,
	): Promise<void> {
		const db = await openDB(dbName, storeName);

		// Check for existing backup with same filePath (deduplication)
		const existing = await new Promise<QueuedBackup | undefined>((resolve) => {
			const tx = db.transaction(storeName, "readonly");
			const store = tx.objectStore(storeName);
			const index = store.index("filePath");
			const request = index.get(backup.filePath);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => resolve(undefined);
		});

		const queuedBackup: QueuedBackup = {
			id: existing?.id ?? `backup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
			...backup,
			createdAt: existing?.createdAt ?? Date.now(),
			attempts: existing?.attempts ?? 0,
			nextRetry: Date.now(),
			status: "pending",
		};

		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(storeName, "readwrite");
			const store = tx.objectStore(storeName);
			const request = store.put(queuedBackup);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});

		db.close();
		setupOnlineListener();
	}

	/**
	 * Get all pending backups
	 */
	async function getPending(): Promise<QueuedBackup[]> {
		const db = await openDB(dbName, storeName);

		const result = await new Promise<QueuedBackup[]>((resolve, reject) => {
			const tx = db.transaction(storeName, "readonly");
			const store = tx.objectStore(storeName);
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result.filter((b) => b.status !== "processing"));
			request.onerror = () => reject(request.error);
		});

		db.close();
		return result;
	}

	/**
	 * Flush the queue - process all pending backups
	 */
	async function flush(): Promise<void> {
		if (!navigator.onLine) {
			return;
		}

		const pending = await getPending();
		const now = Date.now();

		for (const backup of pending) {
			// Skip if not ready for retry
			if (backup.nextRetry > now) {
				continue;
			}

			// Mark as processing
			await updateStatus(backup.id, "processing");

			try {
				const success = config.onFlush ? await config.onFlush(backup) : false;

				if (success) {
					await remove(backup.id);
				} else {
					await markFailed(backup);
				}
			} catch {
				await markFailed(backup);
			}
		}
	}

	/**
	 * Update backup status
	 */
	async function updateStatus(id: string, status: QueuedBackup["status"]): Promise<void> {
		const db = await openDB(dbName, storeName);

		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(storeName, "readwrite");
			const store = tx.objectStore(storeName);
			const request = store.get(id);
			request.onsuccess = () => {
				const backup = request.result;
				if (backup) {
					backup.status = status;
					store.put(backup);
				}
				resolve();
			};
			request.onerror = () => reject(request.error);
		});

		db.close();
	}

	/**
	 * Mark backup as failed and schedule retry
	 */
	async function markFailed(backup: QueuedBackup): Promise<void> {
		const db = await openDB(dbName, storeName);
		const newAttempts = backup.attempts + 1;

		if (newAttempts >= maxRetries) {
			// Remove after max retries
			await remove(backup.id);
			return;
		}

		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(storeName, "readwrite");
			const store = tx.objectStore(storeName);
			const request = store.put({
				...backup,
				status: "failed" as const,
				attempts: newAttempts,
				nextRetry: getNextRetryTime(newAttempts),
			});
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});

		db.close();
	}

	/**
	 * Remove a backup from the queue
	 */
	async function remove(id: string): Promise<void> {
		const db = await openDB(dbName, storeName);

		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(storeName, "readwrite");
			const store = tx.objectStore(storeName);
			const request = store.delete(id);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});

		db.close();
	}

	/**
	 * Clear all backups from the queue
	 */
	async function clear(): Promise<void> {
		const db = await openDB(dbName, storeName);

		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(storeName, "readwrite");
			const store = tx.objectStore(storeName);
			const request = store.clear();
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});

		db.close();
	}

	/**
	 * Set up listener for online event
	 */
	function setupOnlineListener(): void {
		if (isListening || typeof window === "undefined") {
			return;
		}

		isListening = true;
		window.addEventListener("online", () => {
			flush();
		});
	}

	return {
		add,
		getPending,
		flush,
		remove,
		clear,
	};
}
