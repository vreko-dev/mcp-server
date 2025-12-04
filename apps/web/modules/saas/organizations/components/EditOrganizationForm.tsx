"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@snapback/auth/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import { Textarea } from "@ui/components/textarea";
import { AlertCircleIcon, LoaderIcon, SaveIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const editOrgSchema = z.object({
	name: z
		.string()
		.min(2, "Name must be at least 2 characters")
		.max(100, "Name must be less than 100 characters"),
	description: z
		.string()
		.max(500, "Description must be less than 500 characters")
		.optional()
		.nullable(),
});

type EditOrgFormValues = z.infer<typeof editOrgSchema>;

interface Organization {
	id: string;
	name: string;
	description?: string | null;
	logo?: string | null;
	slug?: string;
	metadata?: Record<string, unknown>;
}

export function EditOrganizationForm({
	organizationId,
	initialData,
}: {
	organizationId: string;
	initialData: Organization;
}) {
	const queryClient = useQueryClient();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const form = useForm<EditOrgFormValues>({
		resolver: zodResolver(editOrgSchema),
		values: {
			name: initialData.name || "",
			description: initialData.description || "",
		},
	});

	const onSubmit = async (values: EditOrgFormValues) => {
		setIsLoading(true);
		setError(null);

		toast.promise(
			(async () => {
				const { error: apiError } =
					await authClient.organization.updateOrganization({
						organizationId,
						...values,
					});

				if (apiError) {
					throw new Error(apiError.message || "Failed to update organization");
				}

				// Invalidate org queries
				queryClient.invalidateQueries({
					queryKey: ["organization", organizationId],
				});

				// Reset form to show no dirty state
				form.reset(values);
			})(),
			{
				loading: "Updating organization settings...",
				success: "Organization settings updated successfully",
				error: (err) =>
					`Failed to update: ${err instanceof Error ? err.message : "Unknown error"}`,
			},
		);

		setIsLoading(false);
	};

	const isDirty = form.formState.isDirty;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Organization Settings</CardTitle>
				<CardDescription>
					Update your organization's name and description
				</CardDescription>
			</CardHeader>
			<CardContent>
				{error && (
					<div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/50 flex gap-2">
						<AlertCircleIcon className="size-5 text-destructive flex-shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-destructive">{error}</p>
						</div>
					</div>
				)}

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						{/* Organization Name */}
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Organization Name</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder="Your organization name"
											disabled={isLoading}
										/>
									</FormControl>
									<FormDescription>
										The name of your organization, visible to all members
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Description */}
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											placeholder="Describe your organization"
											rows={4}
											disabled={isLoading}
											value={field.value || ""}
										/>
									</FormControl>
									<FormDescription>
										A brief description of your organization (max 500
										characters)
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Action Buttons */}
						<div className="flex gap-3 pt-2">
							<Button
								type="submit"
								disabled={!isDirty || isLoading}
								className="flex-1"
							>
								{isLoading ? (
									<>
										<LoaderIcon className="size-4 mr-2 animate-spin" />
										Saving...
									</>
								) : (
									<>
										<SaveIcon className="size-4 mr-2" />
										Save Changes
									</>
								)}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => form.reset()}
								disabled={!isDirty || isLoading}
								className="flex-1"
							>
								Cancel
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
