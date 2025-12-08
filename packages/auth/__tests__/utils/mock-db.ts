import { vi } from "vitest";

/**
 * Mock database utilities for auth testing
 * Provides consistent test data and database mocking
 */

export const createMockDatabase = () => {
	const mockUsers = new Map();
	const mockSessions = new Map();
	const mockInvitations = new Map();
	const mockApiKeys = new Map();
	const mockOrganizations = new Map();
	const mockMembers = new Map();
	const mockAccounts = new Map();

	return {
		// User operations
		getUserByEmail: vi.fn(async (email: string) => mockUsers.get(email) ?? null),
		getUserById: vi.fn(async (id: string) => {
			for (const user of mockUsers.values()) {
				if (user.id === id) {
					return user;
				}
			}
			return null;
		}),
		createUser: vi.fn(async (data: any) => {
			const user = {
				...data,
				id: crypto.randomUUID(),
				createdAt: new Date(),
				emailVerified: data.emailVerified ?? false,
			};
			mockUsers.set(data.email, user);
			return user;
		}),
		deleteUser: vi.fn(async (id: string) => {
			for (const [email, user] of mockUsers.entries()) {
				if (user.id === id) {
					mockUsers.delete(email);
					return true;
				}
			}
			return false;
		}),

		// Session operations
		getSession: vi.fn(async (token: string) => mockSessions.get(token)),
		createSession: vi.fn(async (data: any) => {
			const session = {
				...data,
				id: crypto.randomUUID(),
				createdAt: new Date(),
			};
			mockSessions.set(data.token, session);
			return session;
		}),
		deleteSession: vi.fn(async (token: string) => {
			mockSessions.delete(token);
			return true;
		}),
		updateSession: vi.fn(async (token: string, data: any) => {
			const session = mockSessions.get(token);
			if (session) {
				const updated = { ...session, ...data };
				mockSessions.set(token, updated);
				return updated;
			}
			return null;
		}),

		// Invitation operations
		getInvitationById: vi.fn(async (id: string) => mockInvitations.get(id)),
		getPendingInvitationByEmail: vi.fn(async (email: string) => {
			for (const invitation of mockInvitations.values()) {
				if (invitation.email === email && invitation.status === "pending") {
					return invitation;
				}
			}
			return null;
		}),
		createInvitation: vi.fn(async (data: any) => {
			const invitation = {
				...data,
				id: crypto.randomUUID(),
				createdAt: new Date(),
				status: "pending",
			};
			mockInvitations.set(invitation.id, invitation);
			return invitation;
		}),

		// API Key operations
		getApiKey: vi.fn(async (key: string) => mockApiKeys.get(key)),
		createApiKey: vi.fn(async (data: any) => {
			const apiKey = {
				...data,
				id: crypto.randomUUID(),
				createdAt: new Date(),
			};
			mockApiKeys.set(data.key, apiKey);
			return apiKey;
		}),
		revokeApiKey: vi.fn(async (key: string) => {
			const apiKey = mockApiKeys.get(key);
			if (apiKey) {
				apiKey.revokedAt = new Date();
				return apiKey;
			}
			return null;
		}),

		// Organization operations
		getOrganizationById: vi.fn(async (id: string) => mockOrganizations.get(id)),
		createOrganization: vi.fn(async (data: any) => {
			const org = {
				...data,
				id: crypto.randomUUID(),
				createdAt: new Date(),
			};
			mockOrganizations.set(org.id, org);
			return org;
		}),
		deleteOrganization: vi.fn(async (id: string) => {
			mockOrganizations.delete(id);
			return true;
		}),

		// Member operations
		getMember: vi.fn(async (userId: string, orgId: string) => {
			const key = `${userId}-${orgId}`;
			return mockMembers.get(key);
		}),
		createMember: vi.fn(async (data: any) => {
			const key = `${data.userId}-${data.organizationId}`;
			const member = {
				...data,
				id: crypto.randomUUID(),
				createdAt: new Date(),
			};
			mockMembers.set(key, member);
			return member;
		}),
		updateMemberRole: vi.fn(async (userId: string, orgId: string, role: string) => {
			const key = `${userId}-${orgId}`;
			const member = mockMembers.get(key);
			if (member) {
				member.role = role;
				return member;
			}
			return null;
		}),

		// Account operations (OAuth)
		getAccountByProviderId: vi.fn(async (providerId: string, accountId: string) => {
			const key = `${providerId}-${accountId}`;
			return mockAccounts.get(key);
		}),
		createAccount: vi.fn(async (data: any) => {
			const key = `${data.providerId}-${data.accountId}`;
			const account = {
				...data,
				id: crypto.randomUUID(),
				createdAt: new Date(),
			};
			mockAccounts.set(key, account);
			return account;
		}),

		// Purchases (for billing tests)
		getPurchasesByUserId: vi.fn(async () => []),
		getPurchasesByOrganizationId: vi.fn(async () => []),

		// Utility methods for testing
		_reset: () => {
			mockUsers.clear();
			mockSessions.clear();
			mockInvitations.clear();
			mockApiKeys.clear();
			mockOrganizations.clear();
			mockMembers.clear();
			mockAccounts.clear();
		},
		_getState: () => ({
			users: Array.from(mockUsers.values()),
			sessions: Array.from(mockSessions.values()),
			invitations: Array.from(mockInvitations.values()),
			apiKeys: Array.from(mockApiKeys.values()),
			organizations: Array.from(mockOrganizations.values()),
			members: Array.from(mockMembers.values()),
			accounts: Array.from(mockAccounts.values()),
		}),
	};
};

export type MockDatabase = ReturnType<typeof createMockDatabase>;
