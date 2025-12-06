import type { Notification } from "../domain/types";
import { db } from "./db";

/**
 * Repository for managing notifications in IndexedDB
 */
const generateId = () =>
	crypto?.randomUUID
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2, 11);

type NotificationInput =
	| Notification
	| (Omit<Notification, "id"> & { id?: string });

export class NotificationRepo {
	/**
	 * Creates a new notification
	 */
	async create(notification: NotificationInput): Promise<Notification> {
		const record: Notification = notification.id
			? (notification as Notification)
			: {
					...(notification as Omit<Notification, "id">),
					id: generateId(),
				};

		try {
			await db.notifications.put(record);
		} catch (error) {
			if (error instanceof DOMException && error.name === "ConstraintError") {
				const retry: Notification = { ...record, id: generateId() };
				await db.notifications.put(retry);
				return retry;
			}
			throw error;
		}
		return record;
	}

	/**
	 * Creates multiple notifications in a batch
	 */
	async saveMany(notifications: NotificationInput[]): Promise<Notification[]> {
		const records: Notification[] = notifications.map((notification) =>
			notification.id
				? (notification as Notification)
				: {
						...(notification as Omit<Notification, "id">),
						id: generateId(),
					},
		);

		await db.notifications.bulkPut(records);
		return records;
	}

	/**
	 * Gets all notifications
	 */
	async getAll(): Promise<Notification[]> {
		return db.notifications.orderBy("timestamp").reverse().toArray();
	}

	/**
	 * Gets recent notifications
	 */
	async getRecent(limit = 10): Promise<Notification[]> {
		return db.notifications
			.orderBy("timestamp")
			.reverse()
			.limit(limit)
			.toArray();
	}

	/**
	 * Gets a specific notification by ID
	 */
	async getById(id: string): Promise<Notification | undefined> {
		return db.notifications.get(id);
	}

	/**
	 * Updates a notification
	 */
	async update(id: string, updates: Partial<Notification>): Promise<void> {
		await db.notifications.update(id, updates);
	}

	/**
	 * Deletes a notification
	 */
	async delete(id: string): Promise<void> {
		await db.notifications.delete(id);
	}

	/**
	 * Clears all notifications
	 */
	async clearAll(): Promise<void> {
		await db.notifications.clear();
	}
}
