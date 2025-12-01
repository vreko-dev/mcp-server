// Data types for SnapBack dashboard

export interface Snapshot {
	id: string;
	name: string;
	createdAt: Date;
	fileCount: number;
	sizeBytes: number;
	tags: string[];
}

export interface ApiKey {
	id: string;
	name: string;
	preview: string;
	createdAt: Date;
	lastUsedAt: Date | null;
	status: "active" | "revoked";
}

export interface UsageMetrics {
	snapshotsUsed: number;
	snapshotsLimit: number | null;
	cloudStorageUsedMb: number;
	cloudStorageLimitMb: number | null;
}

export interface Subscription {
	plan: "free" | "solo" | "team";
	status: "active" | "trialing" | "cancelled";
	currentPeriodEnd: Date | null;
	trialEnd: Date | null;
}
