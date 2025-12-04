import { orpcClient } from "@shared/lib/orpc-client";
// Note: OrganizationMetadata type is available from @snapback/auth if needed
import { useMutation, useQuery } from "@tanstack/react-query";

export const organizationListQueryKey = ["user", "organizations"] as const;
export const useOrganizationListQuery = () => {
	return useQuery({
		queryKey: organizationListQueryKey,
		queryFn: async () => {
			// TODO: Replace with actual auth client when backend is ready
			// const { data, error } = await authClient.organization.list();
			const { data, error } = { data: null, error: null };

			if (error) {
				throw new Error("Failed to fetch organizations");
			}

			return data;
		},
	});
};

export const activeOrganizationQueryKey = (slug: string) =>
	["user", "activeOrganization", slug] as const;
export const useActiveOrganizationQuery = (
	slug: string,
	options?: {
		enabled?: boolean;
	},
) => {
	return useQuery({
		queryKey: activeOrganizationQueryKey(slug),
		queryFn: async () => {
			// TODO: Replace with actual auth client when backend is ready
			// const { data, error } = await authClient.organization.getFullOrganization({ query: { organizationSlug: slug } });
			const { data, error } = { data: null, error: null };

			if (error) {
				throw new Error("Failed to fetch active organization");
			}

			return data;
		},
		enabled: options?.enabled,
	});
};

export const fullOrganizationQueryKey = (id: string) =>
	["fullOrganization", id] as const;
export const useFullOrganizationQuery = (id: string) => {
	return useQuery({
		queryKey: fullOrganizationQueryKey(id),
		queryFn: async () => {
			// TODO: Replace with actual auth client when backend is ready
			// const { data, error } = await authClient.organization.getFullOrganization({ query: { organizationId: id } });
			const { data, error } = { data: null, error: null };

			if (error) {
				throw new Error("Failed to fetch full organization");
			}

			return data;
		},
	});
};

/*
 * Create organization
 */
export const createOrganizationMutationKey = ["create-organization"] as const;
export const useCreateOrganizationMutation = () => {
	return useMutation({
		mutationKey: createOrganizationMutationKey,
		mutationFn: async ({
			name,
			metadata: _metadata,
		}: {
			name: string;
			metadata?: any;
		}) => {
			const { slug: _slug } = await orpcClient.organizations.generateSlug({
				name,
			});

			// TODO: Replace with actual auth client when backend is ready
			// const { error, data } = await authClient.organization.create({ name, slug, metadata });
			const { error, data }: { error: null; data: null } = {
				error: null,
				data: null,
			};

			if (error) {
				throw error;
			}

			return data as unknown as { slug: string; id: string };
		},
	});
};

/*
 * Update organization
 */
export const updateOrganizationMutationKey = ["update-organization"] as const;
export const useUpdateOrganizationMutation = () => {
	return useMutation({
		mutationKey: updateOrganizationMutationKey,
		mutationFn: async ({
			id: _id,
			name,
			metadata: _metadata,
			updateSlug,
		}: {
			id: string;
			name: string;
			metadata?: any;
			updateSlug?: boolean;
		}) => {
			if (updateSlug) {
				await orpcClient.organizations.generateSlug({
					name,
				});
			}

			// TODO: Replace with actual auth client when backend is ready
			// const { error, data } = await authClient.organization.update({ organizationId: id, data: { name, slug, metadata } });
			const { error, data } = { error: null, data: null };

			if (error) {
				throw error;
			}

			return data;
		},
	});
};
