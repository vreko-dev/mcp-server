"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { getAdminPath } from "@saas/admin/lib/links";
import { InviteMemberForm } from "@saas/organizations/components/InviteMemberForm";
import { OrganizationMembersBlock } from "@saas/organizations/components/OrganizationMembersBlock";
import {
	fullOrganizationQueryKey,
	useCreateOrganizationMutation,
	useFullOrganizationQuery,
	useUpdateOrganizationMutation,
} from "@saas/organizations/lib/api";
import { useRouter } from "@shared/hooks/router";
// import { orpc } from "@shared/lib/orpc-query-utils"; // TODO: Re-enable when admin API is available
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const organizationFormSchema = z.object({
	name: z.string().min(1),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export function OrganizationForm({
	organizationId,
}: {
	organizationId: string;
}) {
	const router = useRouter();

	const { data: organization } = useFullOrganizationQuery(organizationId);

	const updateOrganizationMutation = useUpdateOrganizationMutation();
	const createOrganizationMutation = useCreateOrganizationMutation();
	const queryClient = useQueryClient();

	const form = useForm<OrganizationFormValues>({
		resolver: zodResolver(organizationFormSchema),
		defaultValues: {
			name: (organization as any)?.name ?? "",
		},
	});

	const onSubmit = form.handleSubmit(async ({ name }: OrganizationFormValues) => {
		try {
			const org = organization as any;
			const newOrganization = org
				? await updateOrganizationMutation.mutateAsync({
						id: org.id,
						name,
						updateSlug: org.name !== name,
					})
				: await createOrganizationMutation.mutateAsync({
						name,
					});

			if (!newOrganization) {
				throw new Error("Could not save organization");
			}

			queryClient.setQueryData(
				fullOrganizationQueryKey(organizationId),
				newOrganization,
			);

			// TODO: Re-enable when admin API is available
			// queryClient.invalidateQueries({
			// 	queryKey: orpc.admin.organizations.list.key(),
			// });

			toast.success("Organization saved successfully");

			if (!organization) {
				router.replace(getAdminPath(`/organizations/${(newOrganization as any).id}`));
			}
		} catch {
			toast.error("Failed to save organization");
		}
	});

	return (
		<div className="grid grid-cols-1 gap-4">
			<Card>
				<CardHeader>
					<CardTitle>
						{organization ? "Update Organization" : "Create Organization"}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={onSubmit} className="grid grid-cols-1 gap-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }: any) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex justify-end">
								<Button
									type="submit"
									loading={
										updateOrganizationMutation.isPending ||
										createOrganizationMutation.isPending
									}
								>
									Save
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>

			{organization && (
				<>
					<OrganizationMembersBlock organizationId={(organization as any).id} />
					<InviteMemberForm organizationId={(organization as any).id} />
				</>
			)}
		</div>
	);
}
