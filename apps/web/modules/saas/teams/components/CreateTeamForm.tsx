"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@snapback/auth/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@ui/components/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@ui/components/form";
import { Input } from "@ui/components/input";
import { Textarea } from "@ui/components/textarea";
import { AlertCircleIcon, LoaderIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createTeamSchema = z.object({
	name: z
		.string()
		.min(2, "Team name must be at least 2 characters")
		.max(100, "Team name must be less than 100 characters"),
	description: z.string().max(500, "Description must be less than 500 characters").optional().nullable(),
});

type CreateTeamFormValues = z.infer<typeof createTeamSchema>;

interface Member {
	id: string;
	name: string;
	email: string;
	role: "owner" | "admin" | "member";
}

export function CreateTeamForm({
	organizationId,
	members = [],
	onSuccess,
	open = false,
	onOpenChange,
}: {
	organizationId: string;
	members?: Member[];
	onSuccess?: () => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

	const form = useForm<CreateTeamFormValues>({
		resolver: zodResolver(createTeamSchema),
		defaultValues: {
			name: "",
			description: "",
		},
	});

	const onSubmit = async (values: CreateTeamFormValues) => {
		setIsLoading(true);
		setError(null);

		toast.promise(
			(async () => {
				// biome-ignore lint/suspicious/noExplicitAny: Better Auth API varies
				const { error: apiError } = (await (authClient.organization as any).createTeam?.({
					organizationId,
					...values,
					memberIds: Array.from(selectedMembers),
				})) || { error: null };

				if (apiError) {
					throw new Error(apiError.message || "Failed to create team");
				}

				// Invalidate team queries
				queryClient.invalidateQueries({
					queryKey: ["teams", organizationId],
				});

				// Reset form
				form.reset();
				setSelectedMembers(new Set());

				if (onSuccess) {
					onSuccess();
				}

				if (onOpenChange) {
					onOpenChange(false);
				}
			})(),
			{
				loading: "Creating team...",
				success: "Team created successfully",
				error: (err: unknown) =>
					`Failed to create team: ${err instanceof Error ? err.message : "Unknown error"}`,
			},
		);

		setIsLoading(false);
	};

	const toggleMember = (memberId: string) => {
		const newSelected = new Set(selectedMembers);
		if (newSelected.has(memberId)) {
			newSelected.delete(memberId);
		} else {
			newSelected.add(memberId);
		}
		setSelectedMembers(newSelected);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Create New Team</DialogTitle>
					<DialogDescription>Teams allow you to organize members within your organization</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="p-3 rounded-md bg-destructive/10 border border-destructive/50 flex gap-2">
						<AlertCircleIcon className="size-5 text-destructive flex-shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-destructive">{error}</p>
						</div>
					</div>
				)}

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						{/* Team Name */}
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Team Name</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder="e.g., Engineering, Design, Marketing"
											disabled={isLoading}
										/>
									</FormControl>
									<FormDescription>
										A unique name for your team within this organization
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
											placeholder="What does this team do?"
											rows={3}
											disabled={isLoading}
											value={field.value || ""}
										/>
									</FormControl>
									<FormDescription>
										Brief description of the team's purpose (max 500 characters)
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Member Selection */}
						<FormItem>
							<FormLabel>Team Members</FormLabel>
							<div className="border rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto">
								{members.length === 0 ? (
									<p className="text-sm text-muted-foreground">No members available to add</p>
								) : (
									members.map((member) => (
										<div
											key={member.id}
											className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
										>
											<Checkbox
												id={`member-${member.id}`}
												checked={selectedMembers.has(member.id)}
												onCheckedChange={() => toggleMember(member.id)}
												disabled={isLoading}
											/>
											<label
												htmlFor={`member-${member.id}`}
												className="flex-1 cursor-pointer text-sm"
											>
												<div className="font-medium">{member.name}</div>
												<div className="text-xs text-muted-foreground">{member.email}</div>
											</label>
											<span className="text-xs font-medium text-primary capitalize bg-primary/10 px-2 py-1 rounded">
												{member.role}
											</span>
										</div>
									))
								)}
							</div>
							<FormDescription>
								Select members to add to this team (optional - you will be automatically included)
							</FormDescription>
						</FormItem>

						{/* Action Buttons */}
						<div className="flex gap-3 pt-4">
							<Button type="submit" disabled={isLoading} className="flex-1">
								{isLoading ? (
									<>
										<LoaderIcon className="size-4 mr-2 animate-spin" />
										Creating...
									</>
								) : (
									<>
										<PlusIcon className="size-4 mr-2" />
										Create Team
									</>
								)}
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={isLoading}
								onClick={() => onOpenChange?.(false)}
								className="flex-1"
							>
								Cancel
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
