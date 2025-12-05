import { createAccessControl } from "better-auth/plugins/access";

/**
 * Organization Access Control Configuration
 *
 * Defines resources, permissions, and roles for multi-tenant organizations
 * Used by Better Auth organization plugin for RBAC enforcement
 */

// Define all organization resources and their available permissions
export const statement = {
	// Snapshot management permissions
	snapshot: ["create", "read", "update", "delete", "restore"],

	// API key management permissions
	apiKey: ["create", "read", "revoke"],

	// Member management permissions
	member: ["invite", "remove", "update"],

	// Organization settings permissions
	organization: ["read", "update", "delete"],

	// Billing and subscription permissions
	billing: ["read", "update"],

	// Analytics and reporting permissions
	analytics: ["read"],
} as const;

// Create access control instance
export const ac = createAccessControl(statement);

/**
 * Member Role - Read-only access
 * Can view snapshots and analytics, create own snapshots
 */
export const member = ac.newRole({
	snapshot: ["create", "read", "restore"],
	analytics: ["read"],
});

/**
 * Admin Role - Management access
 * Can manage snapshots, API keys, invite members, view billing
 */
export const admin = ac.newRole({
	snapshot: ["create", "read", "update", "delete", "restore"],
	apiKey: ["create", "read", "revoke"],
	member: ["invite", "update"],
	organization: ["read", "update"],
	billing: ["read"],
	analytics: ["read"],
});

/**
 * Owner Role - Full access
 * Complete control over organization including deletion
 */
export const owner = ac.newRole({
	snapshot: ["create", "read", "update", "delete", "restore"],
	apiKey: ["create", "read", "revoke"],
	member: ["invite", "remove", "update"],
	organization: ["read", "update", "delete"],
	billing: ["read", "update"],
	analytics: ["read"],
});
