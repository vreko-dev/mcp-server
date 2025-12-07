"use client";

import { authClient } from "@snapback/auth/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { OrganizationRoleSelect } from "@saas/organizations/components/OrganizationRoleSelect";
import { fullOrganizationQueryKey } from "@saas/organizations/lib/api";
import { SettingsItem } from "@saas/shared/components/SettingsItem";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@ui/components/form";
import { Input } from "@ui/components/input";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
	email: z.string().email(),
	role: z.enum(["member", "owner", "admin"]),
});

type FormValues = z.infer<typeof formSchema>;

export function InviteMemberForm({ organizationId }: { organizationId: string }) {
	const queryClient = useQueryClient();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			role: "member",
		},
	});

	const onSubmit: SubmitHandler<FormValues> = async (values) => {
		try {
			const { error } = await authClient.organization.inviteMember({
				email: values.email,
				role: values.role,
				organizationId,
			});

			if (error) {
				toast.error(error.message || "Failed to invite member");
				return;
			}

			form.reset();

			queryClient.invalidateQueries({
				queryKey: fullOrganizationQueryKey(organizationId),
			});

			toast.success("Member invited successfully");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to invite member";
			toast.error(message);
		}
	};

	return (
		<SettingsItem title="Invite Member" description="Invite a new member to join your organization">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="@container">
					<div className="flex @md:flex-row flex-col gap-2">
						<div className="flex-1">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input type="email" {...field} />
										</FormControl>
									</FormItem>
								)}
							/>
						</div>

						<div>
							<FormField
								control={form.control}
								name="role"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Role</FormLabel>
										<FormControl>
											<OrganizationRoleSelect value={field.value} onSelect={field.onChange} />
										</FormControl>
									</FormItem>
								)}
							/>
						</div>
					</div>

					<div className="mt-4 flex justify-end">
						<Button type="submit" loading={form.formState.isSubmitting}>
							Invite Member
						</Button>
					</div>
				</form>
			</Form>
		</SettingsItem>
	);
}
