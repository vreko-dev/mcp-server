var __awaiter =
	(this && this.__awaiter) ||
	((thisArg, _arguments, P, generator) => {
		function adopt(value) {
			return value instanceof P
				? value
				: new P((resolve) => {
						resolve(value);
					});
		}
		return new (P || (P = Promise))((resolve, reject) => {
			function fulfilled(value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected(value) {
				try {
					step(generator.throw(value));
				} catch (e) {
					reject(e);
				}
			}
			function step(result) {
				result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	});

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
		getUserByEmail: vi.fn((email) =>
			__awaiter(void 0, void 0, void 0, function* () {
				var _a;
				return (_a = mockUsers.get(email)) !== null && _a !== void 0 ? _a : null;
			}),
		),
		getUserById: vi.fn((id) =>
			__awaiter(void 0, void 0, void 0, function* () {
				for (const user of mockUsers.values()) {
					if (user.id === id) {
						return user;
					}
				}
				return null;
			}),
		),
		createUser: vi.fn((data) =>
			__awaiter(void 0, void 0, void 0, function* () {
				var _a;
				const user = Object.assign(Object.assign({}, data), {
					id: crypto.randomUUID(),
					createdAt: new Date(),
					emailVerified: (_a = data.emailVerified) !== null && _a !== void 0 ? _a : false,
				});
				mockUsers.set(data.email, user);
				return user;
			}),
		),
		deleteUser: vi.fn((id) =>
			__awaiter(void 0, void 0, void 0, function* () {
				for (const [email, user] of mockUsers.entries()) {
					if (user.id === id) {
						mockUsers.delete(email);
						return true;
					}
				}
				return false;
			}),
		),
		// Session operations
		getSession: vi.fn((token) =>
			__awaiter(void 0, void 0, void 0, function* () {
				return mockSessions.get(token);
			}),
		),
		createSession: vi.fn((data) =>
			__awaiter(void 0, void 0, void 0, function* () {
				const session = Object.assign(Object.assign({}, data), {
					id: crypto.randomUUID(),
					createdAt: new Date(),
				});
				mockSessions.set(data.token, session);
				return session;
			}),
		),
		deleteSession: vi.fn((token) =>
			__awaiter(void 0, void 0, void 0, function* () {
				mockSessions.delete(token);
				return true;
			}),
		),
		updateSession: vi.fn((token, data) =>
			__awaiter(void 0, void 0, void 0, function* () {
				const session = mockSessions.get(token);
				if (session) {
					const updated = Object.assign(Object.assign({}, session), data);
					mockSessions.set(token, updated);
					return updated;
				}
				return null;
			}),
		),
		// Invitation operations
		getInvitationById: vi.fn((id) =>
			__awaiter(void 0, void 0, void 0, function* () {
				return mockInvitations.get(id);
			}),
		),
		getPendingInvitationByEmail: vi.fn((email) =>
			__awaiter(void 0, void 0, void 0, function* () {
				for (const invitation of mockInvitations.values()) {
					if (invitation.email === email && invitation.status === "pending") {
						return invitation;
					}
				}
				return null;
			}),
		),
		createInvitation: vi.fn((data) =>
			__awaiter(void 0, void 0, void 0, function* () {
				const invitation = Object.assign(Object.assign({}, data), {
					id: crypto.randomUUID(),
					createdAt: new Date(),
					status: "pending",
				});
				mockInvitations.set(invitation.id, invitation);
				return invitation;
			}),
		),
		// API Key operations
		getApiKey: vi.fn((key) =>
			__awaiter(void 0, void 0, void 0, function* () {
				return mockApiKeys.get(key);
			}),
		),
		createApiKey: vi.fn((data) =>
			__awaiter(void 0, void 0, void 0, function* () {
				const apiKey = Object.assign(Object.assign({}, data), {
					id: crypto.randomUUID(),
					createdAt: new Date(),
				});
				mockApiKeys.set(data.key, apiKey);
				return apiKey;
			}),
		),
		revokeApiKey: vi.fn((key) =>
			__awaiter(void 0, void 0, void 0, function* () {
				const apiKey = mockApiKeys.get(key);
				if (apiKey) {
					apiKey.revokedAt = new Date();
					return apiKey;
				}
				return null;
			}),
		),
		// Organization operations
		getOrganizationById: vi.fn((id) =>
			__awaiter(void 0, void 0, void 0, function* () {
				return mockOrganizations.get(id);
			}),
		),
		createOrganization: vi.fn((data) =>
			__awaiter(void 0, void 0, void 0, function* () {
				const org = Object.assign(Object.assign({}, data), {
					id: crypto.randomUUID(),
					createdAt: new Date(),
				});
				mockOrganizations.set(org.id, org);
				return org;
			}),
		),
		deleteOrganization: vi.fn((id) =>
			__awaiter(void 0, void 0, void 0, function* () {
				mockOrganizations.delete(id);
				return true;
			}),
		),
		// Member operations
		getMember: vi.fn((userId, orgId) =>
			__awaiter(void 0, void 0, void 0, function* () {
				const key = `${userId}-${orgId}`;
				return mockMembers.get(key);
			}),
		),
		createMember: vi.fn((data) =>
			__awaiter(void 0, void 0, void 0, function* () {
				const key = `${data.userId}-${data.organizationId}`;
				const member = Object.assign(Object.assign({}, data), {
					id: crypto.randomUUID(),
					createdAt: new Date(),
				});
				mockMembers.set(key, member);
				return member;
			}),
		),
		updateMemberRole: vi.fn((userId, orgId, role) =>
			__awaiter(void 0, void 0, void 0, function* () {
				const key = `${userId}-${orgId}`;
				const member = mockMembers.get(key);
				if (member) {
					member.role = role;
					return member;
				}
				return null;
			}),
		),
		// Account operations (OAuth)
		getAccountByProviderId: vi.fn((providerId, accountId) =>
			__awaiter(void 0, void 0, void 0, function* () {
				const key = `${providerId}-${accountId}`;
				return mockAccounts.get(key);
			}),
		),
		createAccount: vi.fn((data) =>
			__awaiter(void 0, void 0, void 0, function* () {
				const key = `${data.providerId}-${data.accountId}`;
				const account = Object.assign(Object.assign({}, data), {
					id: crypto.randomUUID(),
					createdAt: new Date(),
				});
				mockAccounts.set(key, account);
				return account;
			}),
		),
		// Purchases (for billing tests)
		getPurchasesByUserId: vi.fn(() =>
			__awaiter(void 0, void 0, void 0, function* () {
				return [];
			}),
		),
		getPurchasesByOrganizationId: vi.fn(() =>
			__awaiter(void 0, void 0, void 0, function* () {
				return [];
			}),
		),
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
