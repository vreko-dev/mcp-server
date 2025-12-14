// ============================================
// apps/vscode/src/storage/SnapshotStore.ts
// PRW Patch Day 1-2: Enhanced with V2 schema + PRE pointer checkpoints
// ============================================

import * as vscode from "vscode";
import type { BlobStore } from "./BlobStore";
import type { SeqIndex, StoreState } from "./storeState";
import {
	addToIndex,
	allocateSeq,
	DEFAULT_INDEX,
	DEFAULT_STATE,
	getIdBySeq,
	getSeqById,
	isValidIndex,
	isValidState,
	updateHead,
} from "./storeState";
import type {
	OriginLabel,
	ReasonCode,
	SnapshotFileRef,
	SnapshotFilters,
	SnapshotManifest,
	SnapshotManifestV1,
	SnapshotManifestV2,
	SnapshotWithContent,
	Trigger,
} from "./types";
import { isV2Manifest } from "./types";
import { ensureDirectory, generateId, readJsonFile, writeJsonFile } from "./utils/atomicWrite";

// ============================================
// SnapshotStore (Enhanced for PRW)
// ============================================

export class SnapshotStore {
	private readonly snapshotsUri: vscode.Uri;
	private readonly stateUri: vscode.Uri;
	private readonly indexUri: vscode.Uri;

	private state: StoreState = DEFAULT_STATE;
	private index: SeqIndex = DEFAULT_INDEX;
	private initialized = false;

	constructor(
		private readonly storageUri: vscode.Uri,
		private readonly blobStore: BlobStore,
	) {
		this.snapshotsUri = vscode.Uri.joinPath(storageUri, "snapshots");
		this.stateUri = vscode.Uri.joinPath(storageUri, "state.json");
		this.indexUri = vscode.Uri.joinPath(storageUri, "index.json");
	}

	// ============================================
	// Lifecycle
	// ============================================

	async initialize(): Promise<void> {
		if (this.initialized) return;

		await ensureDirectory(this.snapshotsUri);

		// Load or create state
		const loadedState = await readJsonFile<StoreState>(this.stateUri);
		if (loadedState && isValidState(loadedState)) {
			this.state = loadedState;
		} else {
			// First run or corrupted - rebuild from disk
			await this.rebuildStateFromDisk();
		}

		// Load or create index
		const loadedIndex = await readJsonFile<SeqIndex>(this.indexUri);
		if (loadedIndex && isValidIndex(loadedIndex)) {
			this.index = loadedIndex;
		} else {
			// Rebuild index from manifests
			await this.rebuildIndex();
		}

		this.initialized = true;
	}

	// ============================================
	// Day 1: V2 Schema Support
	// ============================================

	/**
	 * Create a new POST checkpoint (normal snapshot with blobs)
	 */
	async create(
		files: Map<string, string>,
		options: {
			name: string;
			trigger: Trigger;
			metadata?: SnapshotManifestV2["metadata"];
		},
	): Promise<SnapshotManifestV2> {
		this.ensureInitialized();

		// Allocate new seq
		const { newState, seq } = allocateSeq(this.state);
		const id = generateId("snap");
		const timestamp = Date.now();

		// Store each file in blob store
		const fileRefs: Record<string, SnapshotFileRef> = {};
		for (const [filePath, content] of files) {
			const { hash, size } = await this.blobStore.store(content);
			fileRefs[filePath] = { blobHash: hash, size };
		}

		// Create V2 manifest
		const manifest: SnapshotManifestV2 = {
			schemaVersion: 2,
			id,
			seq,
			parentSeq: this.state.headId ? (getSeqById(this.index, this.state.headId) ?? null) : null,
			parentId: this.state.headId,
			type: "POST",
			timestamp,
			name: options.name,
			trigger: options.trigger,
			files: fileRefs,
			metadata: options.metadata,
		};

		// Write manifest
		const manifestUri = vscode.Uri.joinPath(this.snapshotsUri, `${id}.json`);
		await writeJsonFile(manifestUri, manifest);

		// Update state
		this.state = updateHead(newState, id);
		await this.persistState();

		// Update index
		addToIndex(this.index, seq, id);
		await this.persistIndex();

		return manifest;
	}

	// ============================================
	// Day 2: PRE Pointer Checkpoints
	// ============================================

	/**
	 * Create a PRE checkpoint (pointer only, NO blobs written)
	 *
	 * This is the key PRW innovation: create a "bookmark" to the current
	 * state BEFORE a risky operation, without the cost of writing blobs.
	 * Recovery resolves the pointer to find actual content.
	 *
	 * @param options.trigger - What triggered this (usually 'risk-burst')
	 * @param options.reasons - Why this is considered risky
	 * @returns The PRE checkpoint manifest
	 */
	async createPreCheckpoint(options: {
		name: string;
		trigger: Trigger;
		reasons?: ReasonCode[];
		origin?: OriginLabel;
	}): Promise<SnapshotManifestV2> {
		this.ensureInitialized();

		// Allocate new seq
		const { newState, seq } = allocateSeq(this.state);
		const id = generateId("pre"); // 'pre-' prefix for clarity
		const timestamp = Date.now();

		// Create V2 manifest with EMPTY files (pointer only)
		const manifest: SnapshotManifestV2 = {
			schemaVersion: 2,
			id,
			seq,
			parentSeq: this.state.headId ? (getSeqById(this.index, this.state.headId) ?? null) : null,
			parentId: this.state.headId,
			type: "PRE",
			timestamp,
			name: options.name,
			trigger: options.trigger,
			files: {}, // ← KEY: No blobs, just a pointer to parent
			metadata: {
				reasons: options.reasons,
				origin: options.origin,
			},
		};

		// Write manifest (very small - just metadata)
		const manifestUri = vscode.Uri.joinPath(this.snapshotsUri, `${id}.json`);
		await writeJsonFile(manifestUri, manifest);

		// Update state - PRE becomes new head
		this.state = updateHead(newState, id);
		await this.persistState();

		// Update index
		addToIndex(this.index, seq, id);
		await this.persistIndex();

		return manifest;
	}

	/**
	 * Create a PRE_ROLLBACK checkpoint before applying rollback
	 *
	 * Safety net: Before we restore to an old state, bookmark where we are
	 * so the user can undo the rollback if needed.
	 */
	async createPreRollbackCheckpoint(targetCheckpointId: string): Promise<SnapshotManifestV2> {
		return this.createPreCheckpoint({
			name: `Pre-rollback to ${targetCheckpointId}`,
			trigger: "rollback",
			reasons: ["PRE_ROLLBACK"],
		});
	}

	// ============================================
	// Reading Checkpoints
	// ============================================

	/**
	 * Get snapshot manifest by ID
	 */
	async getManifest(id: string): Promise<SnapshotManifest | null> {
		const manifestUri = vscode.Uri.joinPath(this.snapshotsUri, `${id}.json`);
		return readJsonFile<SnapshotManifest>(manifestUri);
	}

	/**
	 * Get snapshot by sequence number
	 */
	async getBySeq(seq: number): Promise<SnapshotManifest | null> {
		const id = getIdBySeq(this.index, seq);
		if (!id) return null;
		return this.getManifest(id);
	}

	/**
	 * Get snapshot with resolved file contents
	 *
	 * For PRE checkpoints: walks back to find the nearest POST ancestor
	 * and resolves content from there.
	 */
	async getWithContent(id: string): Promise<SnapshotWithContent | null> {
		const manifest = await this.getManifest(id);
		if (!manifest) return null;

		// Convert V1 to V2 shape for consistent interface
		const v2Manifest = this.normalizeToV2(manifest);

		// If it's a POST checkpoint, resolve directly
		if (v2Manifest.type === "POST") {
			return this.resolvePostCheckpoint(v2Manifest);
		}

		// It's a PRE/PRE_ROLLBACK - resolve via pointer chain
		return this.resolvePointerCheckpoint(v2Manifest);
	}

	/**
	 * Resolve a POST checkpoint to its content
	 */
	private async resolvePostCheckpoint(manifest: SnapshotManifestV2): Promise<SnapshotWithContent> {
		const contents: Record<string, string> = {};

		for (const [filePath, ref] of Object.entries(manifest.files)) {
			const content = await this.blobStore.retrieve(ref.blobHash);
			if (content !== null) {
				contents[filePath] = content;
			}
		}

		return { ...manifest, contents };
	}

	/**
	 * Resolve a PRE/PRE_ROLLBACK checkpoint by walking back to POST ancestor
	 */
	private async resolvePointerCheckpoint(manifest: SnapshotManifestV2): Promise<SnapshotWithContent | null> {
		// Walk back through the chain until we find a POST checkpoint
		let current: SnapshotManifest | null = manifest;

		while (current) {
			const v2Current = this.normalizeToV2(current);

			// Found a POST - resolve it
			if (v2Current.type === "POST") {
				const resolved = await this.resolvePostCheckpoint(v2Current);
				// Return with original manifest's metadata but ancestor's content
				return {
					...manifest,
					contents: resolved.contents,
				};
			}

			// Keep walking back
			if (v2Current.parentId) {
				current = await this.getManifest(v2Current.parentId);
			} else {
				// Reached the beginning without finding POST - shouldn't happen
				console.warn(`[SnapshotStore] PRE checkpoint ${manifest.id} has no POST ancestor`);
				return null;
			}
		}

		return null;
	}

	/**
	 * Normalize a V1 manifest to V2 shape (for consistent interface)
	 */
	private normalizeToV2(manifest: SnapshotManifest): SnapshotManifestV2 {
		if (isV2Manifest(manifest)) {
			return manifest;
		}

		// Convert V1 to V2
		const v1 = manifest as SnapshotManifestV1;
		const seq = getSeqById(this.index, v1.id) ?? 0;

		// Find parent by looking at the previous seq
		const prevSeq = seq > 1 ? seq - 1 : null;
		const parentId = prevSeq ? (getIdBySeq(this.index, prevSeq) ?? null) : null;

		return {
			schemaVersion: 2,
			id: v1.id,
			seq,
			parentSeq: prevSeq,
			parentId,
			type: "POST", // V1 manifests are always POST
			timestamp: v1.timestamp,
			name: v1.name,
			trigger: v1.trigger as Trigger,
			files: v1.files,
			metadata: v1.metadata,
		};
	}

	// ============================================
	// Listing & Filtering
	// ============================================

	/**
	 * List snapshots with optional filtering
	 */
	async list(filters?: SnapshotFilters): Promise<SnapshotManifest[]> {
		this.ensureInitialized();

		const snapshots: SnapshotManifest[] = [];

		try {
			const entries = await vscode.workspace.fs.readDirectory(this.snapshotsUri);

			for (const [name, type] of entries) {
				if (type !== vscode.FileType.File || !name.endsWith(".json")) continue;

				const id = name.replace(".json", "");
				const manifest = await this.getManifest(id);
				if (!manifest) continue;

				// Apply filters
				if (filters?.after && manifest.timestamp < filters.after) continue;
				if (filters?.before && manifest.timestamp > filters.before) continue;
				if (filters?.trigger && manifest.trigger !== filters.trigger) continue;
				if (filters?.type && isV2Manifest(manifest) && manifest.type !== filters.type) continue;

				snapshots.push(manifest);
			}
		} catch (error) {
			// Directory may not exist yet
			return [];
		}

		// Sort by timestamp descending (newest first)
		snapshots.sort((a, b) => b.timestamp - a.timestamp);

		// Apply limit
		if (filters?.limit) {
			return snapshots.slice(0, filters.limit);
		}

		return snapshots;
	}

	/**
	 * Get the current head checkpoint
	 */
	async getHead(): Promise<SnapshotManifest | null> {
		if (!this.state.headId) return null;
		return this.getManifest(this.state.headId);
	}

	/**
	 * Get checkpoint chain from a given ID back to root
	 */
	async getAncestorChain(id: string, limit = 100): Promise<SnapshotManifest[]> {
		const chain: SnapshotManifest[] = [];
		let current = await this.getManifest(id);

		while (current && chain.length < limit) {
			chain.push(current);
			const v2 = this.normalizeToV2(current);
			if (v2.parentId) {
				current = await this.getManifest(v2.parentId);
			} else {
				break;
			}
		}

		return chain;
	}

	// ============================================
	// Deletion
	// ============================================

	/**
	 * Delete a snapshot (use with caution)
	 */
	async delete(id: string): Promise<void> {
		const manifestUri = vscode.Uri.joinPath(this.snapshotsUri, `${id}.json`);

		try {
			await vscode.workspace.fs.delete(manifestUri);

			// Remove from index
			const seq = getSeqById(this.index, id);
			if (seq !== undefined) {
				delete this.index.bySeq[seq];
				delete this.index.byId[id];
				await this.persistIndex();
			}

			// Update head if needed
			if (this.state.headId === id) {
				// Find new head (previous seq)
				const seqs = Object.keys(this.index.bySeq)
					.map(Number)
					.sort((a, b) => b - a);
				const newHeadSeq = seqs[0];
				this.state = updateHead(this.state, newHeadSeq ? this.index.bySeq[newHeadSeq] : null!);
				await this.persistState();
			}
		} catch (error) {
			// File may not exist
		}
	}

	// ============================================
	// State Management
	// ============================================

	/**
	 * Rebuild state from disk (Option A - no V1 rewriting)
	 */
	private async rebuildStateFromDisk(): Promise<void> {
		const manifests: { manifest: SnapshotManifest; timestamp: number }[] = [];

		try {
			const entries = await vscode.workspace.fs.readDirectory(this.snapshotsUri);

			for (const [name, type] of entries) {
				if (type !== vscode.FileType.File || !name.endsWith(".json")) continue;

				const id = name.replace(".json", "");
				const manifest = await this.getManifest(id);
				if (manifest) {
					manifests.push({ manifest, timestamp: manifest.timestamp });
				}
			}
		} catch {
			// No snapshots directory yet
		}

		// Sort by timestamp and assign virtual seq numbers
		manifests.sort((a, b) => a.timestamp - b.timestamp);

		let maxSeq = 0;
		let headId: string | null = null;

		for (let i = 0; i < manifests.length; i++) {
			const { manifest } = manifests[i];
			const seq = isV2Manifest(manifest) ? manifest.seq : i + 1;
			maxSeq = Math.max(maxSeq, seq);
			headId = manifest.id;
		}

		this.state = {
			schemaVersion: 1,
			lastSeq: maxSeq,
			headId,
			lastUpdatedAt: Date.now(),
		};

		await this.persistState();
	}

	/**
	 * Rebuild index from manifests
	 */
	private async rebuildIndex(): Promise<void> {
		const newIndex: SeqIndex = {
			schemaVersion: 1,
			bySeq: {},
			byId: {},
			rebuiltAt: Date.now(),
		};

		const manifests: { manifest: SnapshotManifest; timestamp: number }[] = [];

		try {
			const entries = await vscode.workspace.fs.readDirectory(this.snapshotsUri);

			for (const [name, type] of entries) {
				if (type !== vscode.FileType.File || !name.endsWith(".json")) continue;

				const id = name.replace(".json", "");
				const manifest = await this.getManifest(id);
				if (manifest) {
					manifests.push({ manifest, timestamp: manifest.timestamp });
				}
			}
		} catch {
			// No snapshots directory yet
		}

		// Sort by timestamp for consistent seq assignment
		manifests.sort((a, b) => a.timestamp - b.timestamp);

		for (let i = 0; i < manifests.length; i++) {
			const { manifest } = manifests[i];
			// Use V2 seq if available, otherwise assign based on sorted position
			const seq = isV2Manifest(manifest) ? manifest.seq : i + 1;
			addToIndex(newIndex, seq, manifest.id);
		}

		this.index = newIndex;
		await this.persistIndex();
	}

	private async persistState(): Promise<void> {
		await writeJsonFile(this.stateUri, this.state);
	}

	private async persistIndex(): Promise<void> {
		await writeJsonFile(this.indexUri, this.index);
	}

	private ensureInitialized(): void {
		if (!this.initialized) {
			throw new Error("SnapshotStore not initialized. Call initialize() first.");
		}
	}

	// ============================================
	// Utilities
	// ============================================

	getState(): StoreState {
		return { ...this.state };
	}

	getIndex(): SeqIndex {
		return { ...this.index };
	}
}
