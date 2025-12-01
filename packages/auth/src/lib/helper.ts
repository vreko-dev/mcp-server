import type { ActiveOrganization, Session } from "../auth.js";

export function isMemberOfOrganization(
	user: Session["user"] | undefined,
	organization: ActiveOrganization,
) {
	return organization.members.some((member: any) => member.userId === user?.id);
}

export function isOrganizationAdmin(
	organization?: ActiveOrganization | null,
	user?: {
		id: string;
		role?: string | null;
	} | null,
) {
	const userOrganizationRole = organization?.members.find(
		(member: any) => member.userId === user?.id,
	)?.role;

	return (
		["owner", "admin"].includes(userOrganizationRole ?? "") ||
		user?.role === "admin"
	);
}
