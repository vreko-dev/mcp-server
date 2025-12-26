import { orpcClient } from "@shared/lib/orpc-client";
import { authClient } from "@snapback/auth/client";
import { useMutation, useQuery } from "@tanstack/react-query";

export const organizationListQueryKey = ["user", "organizations"] as const;
export const useOrganizationListQuery = () => {
	return useQuery({
		queryKey: organizationListQueryKey,
		queryFn: async () => {
			const { data, error } = await authClient.organization.list();

			if (error) {
				throw new Error("Failed to fetch organizations");
			}

			return data;
		},
	});
};

export const activeOrganizationQueryKey = (slug: string) => ["user", "activeOrganization", slug] as const;
export const useActiveOrganizationQuery = (
	slug: string,
	options?: {
		enabled?: boolean;
	},
) => {
	return useQuery({
		queryKey: activeOrganizationQueryKey(slug),
		queryFn: async () => {
			const { data, error } = await authClient.organization.getFullOrganization({
				query: { organizationSlug: slug },
			});

			if (error) {
				throw new Error("Failed to fetch active organization");
			}

			return data;
		},
		enabled: options?.enabled,
	});
};

export const fullOrganizationQueryKey = (id: string) => ["fullOrganization", id] as const;
export const useFullOrganizationQuery = (id: string) => {
	return useQuery({
		queryKey: fullOrganizationQueryKey(id),
		queryFn: async () => {
			const { data, error } = await authClient.organization.getFullOrganization({
				query: { organizationId: id },
			});

			if (error) {
				throw new Error("Failed to fetch full organization");
			}

			return data;
		},
	});
};

/**
 * Create organization mutation
 */
export const createOrganizationMutationKey = ["create-organization"] as const;
export const useCreateOrganizationMutation = () => {
	return useMutation({
		mutationKey: createOrganizationMutationKey,
		mutationFn: async ({ name, metadata }: { name: string; metadata?: Record<string, unknown> }) => {
			const { slug } = await orpcClient.organizations.generateSlug({
				name,
			});

			const { error, data } = await authClient.organization.create({
				name,
				slug,
				metadata,
			});

			if (error) {
				throw error;
			}

			return data as { slug: string; id: string };
		},
	});
};

/**
 * Update organization mutation
 */
export const updateOrganizationMutationKey = ["update-organization"] as const;
export const useUpdateOrganizationMutation = () => {
	return useMutation({
		mutationKey: updateOrganizationMutationKey,
		mutationFn: async ({
			id,
			name,
			metadata,
			updateSlug,
		}: {
			id: string;
			name: string;
			metadata?: Record<string, unknown>;
			updateSlug?: boolean;
		}) => {
			let slug: string | undefined;
			if (updateSlug) {
				const result = await orpcClient.organizations.generateSlug({
					name,
				});
				slug = result.slug;
			}

			const { error, data } = await authClient.organization.update({
				organizationId: id,
				data: { name, slug, metadata },
			});

			if (error) {
				throw error;
			}

			return data;
		},
	});
};
