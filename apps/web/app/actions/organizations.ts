"use server";

import { orpcClient } from "@/modules/shared/lib/orpc-client";

/**
 * Get organization by ID via ORPC API
 * @param organizationId - The organization ID to fetch
 * @returns Organization data
 */
export async function getOrganizationById(organizationId: string) {
	return await orpcClient.organizations.getById({
		id: organizationId,
	});
}
