import type { Policy } from "../domain/types.js";
import { db } from "./db.js";

/**
 * Repository for managing policies in IndexedDB
 */
export class PolicyRepo {
	/**
	 * Saves a policy
	 */
	async save(policy: Policy): Promise<void> {
		await db.policies.put(policy);
	}

	/**
	 * Gets all policies
	 */
	async getAll(): Promise<Policy[]> {
		return db.policies.toArray();
	}

	/**
	 * Gets a policy by pattern
	 */
	async getByPattern(pattern: string): Promise<Policy | undefined> {
		return db.policies.get(pattern);
	}

	/**
	 * Deletes a policy by pattern
	 */
	async delete(pattern: string): Promise<void> {
		await db.policies.delete(pattern);
	}

	/**
	 * Clears all policies
	 */
	async clearAll(): Promise<void> {
		await db.policies.clear();
	}

	/**
	 * Bulk saves policies
	 */
	async saveAll(policies: Policy[]): Promise<void> {
		await db.policies.clear();
		if (policies.length === 0) {
			return;
		}
		await db.policies.bulkPut(policies);
	}
}
