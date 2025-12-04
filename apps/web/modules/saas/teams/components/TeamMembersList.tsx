"use client";

import { authClient } from "@snapback/auth/client";
import { useQueryClient } from "@tanstack/react-query";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog";
import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { AlertCircleIcon, LoaderIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface TeamMember {
	id: string;
	name: string;
	email: string;
	role: "owner" | "admin" | "member";
	joinedAt: string;
}

export function TeamMembersList({
	teamId,
	organizationId,
	onAddMemberClick,
}: {
	teamId: string;
	organizationId: string;
	onAddMemberClick?: () => void;
}) {
	const queryClient = useQueryClient();
	const [members, setMembers] = useState<TeamMember[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [removingId, setRemovingId] = useState<string | null>(null);
	const [updatingId, setUpdatingId] = useState<string | null>(null);
	const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);

	// Fetch team members on mount
	useEffect(() => {
		const fetchMembers = async () => {
			setIsLoading(true);
			setError(null);

			try {
				// biome-ignore lint/suspicious/noExplicitAny: Better Auth response type varies
				const result = (await authClient.organization.listTeamMembers({
					teamId,
				})) as any;

				const membersList = Array.isArray(result)
					? result
					: Array.isArray(result?.data)
						? result.data
						: (result?.data?.members as TeamMember[]) || [];

				if (result?.error) {
					setError(result.error.message || "Failed to load team members");
					setMembers([]);
					return;
				}

				setMembers(membersList);
			} catch (err: unknown) {
				const message =
					err instanceof Error ? err.message : "Failed to load team members";
				setError(message);
				setMembers([]);
			} finally {
				setIsLoading(false);
			}
		};

		fetchMembers();
	}, [teamId]);

	const handleRemove = async (member: TeamMember) => {
		setRemovingId(member.id);

		toast.promise(
			(async () => {
				const { error: apiError } = await authClient.organization.removeMember({
					organizationId: teamId,
					memberIdOrEmail: member.id,
				});

				if (apiError) {
					throw new Error(apiError.message || "Failed to remove member");
				}

				// Remove from list
				setMembers((prev) => prev.filter((m) => m.id !== member.id));

				// Invalidate cache
				queryClient.invalidateQueries({
					queryKey: ["team-members", teamId],
				});

				setConfirmRemove(null);
			})(),
			{
				loading: "Removing member...",
				success: "Member removed successfully",
				error: (err: unknown) =>
					`Failed to remove member: ${err instanceof Error ? err.message : "Unknown error"}`,
			},
		);

		setRemovingId(null);
	};

	const handleRoleChange = async (
		member: TeamMember,
		newRole: "owner" | "admin" | "member",
	) => {
		if (member.role === newRole) return;

		setUpdatingId(member.id);

		toast.promise(
			(async () => {
				const { error: apiError } =
					await authClient.organization.updateMemberRole({
						organizationId: teamId,
						memberId: member.id,
						role: newRole,
					});

				if (apiError) {
					throw new Error(apiError.message || "Failed to update role");
				}

				// Update in list
				setMembers((prev) =>
					prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)),
				);

				// Invalidate cache
				queryClient.invalidateQueries({
					queryKey: ["team-members", teamId],
				});
			})(),
			{
				loading: "Updating role...",
				success: "Role updated successfully",
				error: (err: unknown) =>
					`Failed to update role: ${err instanceof Error ? err.message : "Unknown error"}`,
			},
		);

		setUpdatingId(null);
	};

	// Loading state
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Team Members</CardTitle>
					<CardDescription>Manage team members and their roles</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	// Error state
	if (error) {
		return (
			<Card className="border-destructive/50 bg-destructive/5">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<AlertCircleIcon className="size-5 text-destructive" />
						Failed to Load Members
					</CardTitle>
					<CardDescription>{error}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button variant="outline" onClick={() => window.location.reload()}>
						Retry
					</Button>
				</CardContent>
			</Card>
		);
	}

	// Empty state
	if (members.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Team Members</CardTitle>
					<CardDescription>Manage team members and their roles</CardDescription>
				</CardHeader>
				<CardContent className="text-center py-8">
					<p className="text-muted-foreground mb-4">
						No members in this team yet
					</p>
					<Button onClick={onAddMemberClick}>
						<PlusIcon className="size-4 mr-2" />
						Add Members
					</Button>
				</CardContent>
			</Card>
		);
	}

	// Render members table
	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Team Members</CardTitle>
						<CardDescription>
							{members.length} member
							{members.length !== 1 ? "s" : ""} in this team
						</CardDescription>
					</div>
					<Button size="sm" onClick={onAddMemberClick} variant="outline">
						<PlusIcon className="size-4 mr-2" />
						Add Member
					</Button>
				</CardHeader>
				<CardContent>
					<div className="border rounded-lg overflow-hidden">
						<table className="w-full text-sm">
							<thead className="bg-muted">
								<tr className="border-b">
									<th className="text-left p-4 font-semibold">Name</th>
									<th className="text-left p-4 font-semibold">Email</th>
									<th className="text-left p-4 font-semibold">Role</th>
									<th className="text-left p-4 font-semibold">Joined</th>
									<th className="text-right p-4 font-semibold">Actions</th>
								</tr>
							</thead>
							<tbody>
								{members.map((member, idx) => (
									<tr
										key={member.id}
										className={idx !== members.length - 1 ? "border-b" : ""}
									>
										<td className="p-4">
											<div className="font-medium">{member.name}</div>
										</td>
										<td className="p-4 text-muted-foreground">
											{member.email}
										</td>
										<td className="p-4">
											<Select
												value={member.role}
												onValueChange={(newRole: string) =>
													handleRoleChange(
														member,
														newRole as "owner" | "admin" | "member",
													)
												}
												disabled={updatingId === member.id}
											>
												<SelectTrigger className="w-32">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="owner">Owner</SelectItem>
													<SelectItem value="admin">Admin</SelectItem>
													<SelectItem value="member">Member</SelectItem>
												</SelectContent>
											</Select>
										</td>
										<td className="p-4 text-muted-foreground text-xs">
											{new Intl.DateTimeFormat("en-US", {
												dateStyle: "medium",
											}).format(new Date(member.joinedAt))}
										</td>
										<td className="p-4 text-right">
											<Button
												size="sm"
												variant="ghost"
												onClick={() => setConfirmRemove(member)}
												disabled={removingId === member.id}
											>
												{removingId === member.id ? (
													<LoaderIcon className="size-4 animate-spin" />
												) : (
													<TrashIcon className="size-4" />
												)}
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			{/* Confirm Remove Dialog */}
			<AlertDialog
				open={confirmRemove !== null}
				onOpenChange={() => setConfirmRemove(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Member?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove{" "}
							<span className="font-semibold">{confirmRemove?.name}</span> from
							the team? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="flex gap-3">
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => confirmRemove && handleRemove(confirmRemove)}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Remove
						</AlertDialogAction>
					</div>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
