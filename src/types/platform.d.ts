/**
 * Type declarations for @snapback/platform subpaths
 *
 * Required for Docker builds where tsc --build may not generate
 * .d.ts files due to missing incremental build info from project references.
 */
declare module "@snapback/platform/db/queries" {
	export type WorkspaceTier = "free" | "pro" | "enterprise";

	export interface TierResolutionResult {
		found: boolean;
		tier: WorkspaceTier;
		userId?: string;
		displayName?: string;
	}

	export function resolveTierByWorkspaceId(workspaceId: string): Promise<TierResolutionResult>;

	export function linkWorkspace(params: {
		workspaceId: string;
		userId: string;
		tier?: WorkspaceTier;
		displayName?: string;
	}): Promise<{
		workspaceId: string;
		userId: string;
		tier: WorkspaceTier;
		displayName: string | null;
		createdAt: Date;
		lastSeenAt: Date;
	} | null>;

	export function unlinkWorkspace(workspaceId: string): Promise<boolean>;

	export function updateWorkspaceTier(params: { workspaceId: string; tier: WorkspaceTier }): Promise<boolean>;
}
