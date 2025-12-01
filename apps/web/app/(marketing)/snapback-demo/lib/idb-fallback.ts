/**
 * IndexedDB availability checker and fallback handler
 */

// Simple in-memory storage as fallback
class InMemoryStorage {
	private data: Record<string, any> = {};

	async set(key: string, value: any): Promise<void> {
		this.data[key] = value;
	}

	async get(key: string): Promise<any> {
		return this.data[key];
	}

	async remove(key: string): Promise<void> {
		delete this.data[key];
	}

	async clear(): Promise<void> {
		this.data = {};
	}

	async keys(): Promise<string[]> {
		return Object.keys(this.data);
	}
}

// Check if IndexedDB is available
export function isIndexedDBAvailable(): Promise<boolean> {
	return new Promise((resolve) => {
		if (typeof window === "undefined" || !window.indexedDB) {
			resolve(false);
			return;
		}

		const testDBName = "__snapback_idb_test__";
		let opened: IDBDatabase | null = null;

		const request = window.indexedDB.open(testDBName, 1);

		request.onerror = () => {
			resolve(false);
		};

		request.onsuccess = () => {
			opened = request.result;
			opened.close();
			window.indexedDB.deleteDatabase(testDBName);
			resolve(true);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (db) {
				try {
					db.createObjectStore("test");
				} catch (_e) {
					// Ignore
				}
			}
		};
	});
}

// Storage interface that can switch between IndexedDB and in-memory
export class StorageManager {
	private useIndexedDB = false;
	private inMemoryStorage: InMemoryStorage = new InMemoryStorage();

	async initialize(): Promise<boolean> {
		this.useIndexedDB = await isIndexedDBAvailable();
		return this.useIndexedDB;
	}

	async set(key: string, value: any): Promise<void> {
		if (this.useIndexedDB) {
			// In a real implementation, we would use Dexie
			// For now, we'll use in-memory as fallback
			return this.inMemoryStorage.set(key, value);
		}
		return this.inMemoryStorage.set(key, value);
	}

	async get(key: string): Promise<any> {
		if (this.useIndexedDB) {
			// In a real implementation, we would use Dexie
			// For now, we'll use in-memory as fallback
			return this.inMemoryStorage.get(key);
		}
		return this.inMemoryStorage.get(key);
	}

	async remove(key: string): Promise<void> {
		if (this.useIndexedDB) {
			// In a real implementation, we would use Dexie
			// For now, we'll use in-memory as fallback
			return this.inMemoryStorage.remove(key);
		}
		return this.inMemoryStorage.remove(key);
	}

	isUsingIndexedDB(): boolean {
		return this.useIndexedDB;
	}
}

// Global storage manager instance
export const storageManager = new StorageManager();
