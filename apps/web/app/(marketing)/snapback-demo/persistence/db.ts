import Dexie, { type EntityTable } from "dexie";
import type {
	Notification,
	Policy,
	ProtectedFile,
	Snapshot,
} from "../domain/types";

/**
 * SnapBack database schema using Dexie
 */
class SnapBackDB extends Dexie {
	snapshots!: EntityTable<Snapshot, "id">;
	protectedFiles!: EntityTable<ProtectedFile, "id">;
	notifications!: EntityTable<Notification, "id">;
	policies!: EntityTable<Policy, "pattern">;

	constructor() {
		super("SnapBackDB");

		this.version(2)
			.stores({
				snapshots: "id, fileId, timestamp",
				protectedFiles: "id, path, protectionLevel",
				notifications: "id, timestamp",
				policies: "pattern",
			})
			.upgrade((tx) => {
				void tx.table("snapshots").clear();
				void tx.table("protectedFiles").clear();
				void tx.table("notifications").clear();
				void tx.table("policies").clear();
			});
	}
}

export const db = new SnapBackDB();
