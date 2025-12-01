// roles: Admin, SecurityLead, Developer; perms: override_block, view_audit

export type Role = "Admin" | "SecurityLead" | "Developer";

export interface Permission {
	override_block: boolean;
	view_audit: boolean;
	manage_policy: boolean;
	manage_users: boolean;
}

export class RBAC {
	private rolePermissions: Record<Role, Permission> = {
		Admin: {
			override_block: true,
			view_audit: true,
			manage_policy: true,
			manage_users: true,
		},
		SecurityLead: {
			override_block: true,
			view_audit: true,
			manage_policy: true,
			manage_users: false,
		},
		Developer: {
			override_block: false,
			view_audit: false,
			manage_policy: false,
			manage_users: false,
		},
	};

	private userRoles: Map<string, Role> = new Map();

	assignRole(userId: string, role: Role): void {
		this.userRoles.set(userId, role);
	}

	removeRole(userId: string): void {
		this.userRoles.delete(userId);
	}

	getRole(userId: string): Role | undefined {
		return this.userRoles.get(userId);
	}

	hasPermission(userId: string, permission: keyof Permission): boolean {
		const role = this.userRoles.get(userId);
		if (!role) {
			return false;
		}

		const permissions = this.rolePermissions[role];
		return permissions[permission] || false;
	}

	canOverrideBlock(userId: string): boolean {
		return this.hasPermission(userId, "override_block");
	}

	canViewAudit(userId: string): boolean {
		return this.hasPermission(userId, "view_audit");
	}

	canManagePolicy(userId: string): boolean {
		return this.hasPermission(userId, "manage_policy");
	}

	canManageUsers(userId: string): boolean {
		return this.hasPermission(userId, "manage_users");
	}

	// Static method for testing
	static createTestRBAC(): RBAC {
		const rbac = new RBAC();
		rbac.assignRole("admin-user", "Admin");
		rbac.assignRole("security-user", "SecurityLead");
		rbac.assignRole("developer-user", "Developer");
		return rbac;
	}
}
