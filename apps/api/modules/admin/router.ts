import { findOrganization } from "./procedures/find-organization.js";
import { listOrganizations } from "./procedures/list-organizations.js";
import { listUsers } from "./procedures/list-users.js";

export const adminRouter = {
	users: {
		list: listUsers,
	},
	organizations: {
		list: listOrganizations,
		find: findOrganization,
	},
};
