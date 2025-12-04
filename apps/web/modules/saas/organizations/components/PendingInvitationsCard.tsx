"use client";

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
	AlertCircleIcon,
	CheckIcon,
	ClockIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Invitation {
	id: string;
	organizationId: string;
	organizationName: string;
	organizationLogo?: string | null;
	email: string;
	role: "owner" | "admin" | "member";
	expiresAt: string;
	createdAt: string;
	status: "pending" | "accepted" | "rejected" | "expired";
}

export function PendingInvitationsCard() {
	const queryClient = useQueryClient();
	const [invitations, setInvitations] = useState<Invitation[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [acceptingId, setAcceptingId] = useState<string | null>(null);
	const [rejectingId, setRejectingId] = useState<string | null>(null);

	// Fetch pending invitations on mount
	useEffect(() => {
		const fetchInvitations = async () => {
			setIsLoading(true);
			setError(null);

			try {
				// biome-ignore lint/suspicious/noExplicitAny: Better Auth response type varies
				const result = (await authClient.organization.listUserInvitations()) as any;

				// Better Auth returns invitations directly as array or in data property
				const invitationsList = Array.isArray(result)
					? result
					: Array.isArray(result?.data)
						? result.data
						: (result?.data?.invitations as Invitation[]) || [];

				if (result?.error) {
					setError(
						result.error.message || "Failed to load invitations",
					);
					setInvitations([]);
					return;
				}

				// Filter pending invitations and sort by expiration date
				const pending = (invitationsList as Invitation[])
					.filter((inv) => inv.status === "pending")
					.sort(
						(a, b) =>
							new Date(a.expiresAt).getTime() -
							new Date(b.expiresAt).getTime(),
					);

				setInvitations(pending);
			} catch (err: unknown) {
				const message =
					err instanceof Error ? err.message : "Failed to load invitations";
				setError(message);
				setInvitations([]);
			} finally {
				setIsLoading(false);
			}
		};

		fetchInvitations();
	}, []);

	const handleAccept = async (invitationId: string) => {
		setAcceptingId(invitationId);

		toast.promise(
			(async () => {
				const { data, error } =
					await authClient.organization.acceptInvitation({
						invitationId,
					});

				if (error) {
					throw new Error(error.message || "Failed to accept invitation");
				}

				// Remove from list
				setInvitations((prev) =>
					prev.filter((inv) => inv.id !== invitationId),
				);

				// Invalidate related queries
				queryClient.invalidateQueries({
					queryKey: ["user-invitations"],
				});

				return data;
			})()
		,
		{
			loading: "Accepting invitation...",
			success: "You've successfully joined the organization!",
			error: (err: unknown) =>
				`Failed to accept invitation: ${err instanceof Error ? err.message : "Unknown error"}`,
		},
	);

		setAcceptingId(null);
	};

	const handleReject = async (invitationId: string) => {
		setRejectingId(invitationId);

		toast.promise(
			(async () => {
				const { error } =
					await authClient.organization.rejectInvitation({
						invitationId,
					});

				if (error) {
					throw new Error(error.message || "Failed to reject invitation");
				}

				// Remove from list
				setInvitations((prev) =>
					prev.filter((inv) => inv.id !== invitationId),
				);

				// Invalidate related queries
				queryClient.invalidateQueries({
					queryKey: ["user-invitations"],
				});
			})()
		,
		{
			loading: "Rejecting invitation...",
			success: "Invitation rejected",
			error: (err: unknown) =>
				`Failed to reject invitation: ${err instanceof Error ? err.message : "Unknown error"}`,
		},
	);

		setRejectingId(null);
	};

	// Loading state
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Organization Invitations</CardTitle>
					<CardDescription>
						Pending invitations to join organizations
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{[1, 2].map((i) => (
							<div
								key={i}
								className="h-24 rounded-lg bg-muted animate-pulse"
							/>
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
						Failed to Load Invitations
					</CardTitle>
					<CardDescription>{error}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="outline"
						onClick={() => window.location.reload()}
					>
						Retry
					</Button>
				</CardContent>
			</Card>
		);
	}

	// Empty state
	if (invitations.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Organization Invitations</CardTitle>
					<CardDescription>
						Pending invitations to join organizations
					</CardDescription>
				</CardHeader>
				<CardContent className="text-center py-8 text-muted-foreground">
					<CheckIcon className="size-12 mx-auto mb-3 opacity-30" />
					<p>You don't have any pending invitations</p>
					<p className="text-sm">
						Invitations will appear here when organizations invite you to join
					</p>
				</CardContent>
			</Card>
		);
	}

	// Render invitations
	return (
		<Card>
			<CardHeader>
				<CardTitle>Organization Invitations</CardTitle>
				<CardDescription>
					You have {invitations.length} pending{" "}
					{invitations.length === 1 ? "invitation" : "invitations"}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{invitations.map((invitation) => {
					const expiresAt = new Date(invitation.expiresAt);
					const now = new Date();
					const hoursUntilExpire =
						(expiresAt.getTime() - now.getTime()) / 3600000;
					const isExpiringSoon = hoursUntilExpire < 24 && hoursUntilExpire > 0;
					const isExpired = expiresAt.getTime() < now.getTime();

					return (
						<div
							key={invitation.id}
							className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
						>
							{/* Header: Org name + role */}
							<div className="flex items-start justify-between mb-3">
								<div className="flex-1">
									<h4 className="font-semibold text-sm">
										{invitation.organizationName}
									</h4>
									<p className="text-xs text-muted-foreground">
										{invitation.email}
									</p>
								</div>
								<div className="flex gap-2 ml-3">
									<span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
										{invitation.role}
									</span>
									{isExpired && (
										<span className="inline-block px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
											Expired
										</span>
									)}
								</div>
							</div>

							{/* Expiration info */}
							<div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
								<ClockIcon className="size-3" />
								<span>
									Expires{" "}
									{new Intl.DateTimeFormat("en-US", {
										dateStyle: "medium",
										timeStyle: "short",
									}).format(expiresAt)}
								</span>
								{isExpiringSoon && (
									<span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-500">
										<AlertCircleIcon className="size-3" />
										Expires soon
									</span>
								)}
							</div>

							{/* Action buttons */}
							<div className="flex gap-2">
								<Button
									size="sm"
									onClick={() => handleAccept(invitation.id)}
									disabled={
										isExpired ||
										acceptingId === invitation.id ||
										rejectingId === invitation.id
									}
									className="flex-1"
								>
									<CheckIcon className="size-4 mr-1" />
									Accept
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => handleReject(invitation.id)}
									disabled={
										acceptingId === invitation.id ||
										rejectingId === invitation.id
									}
									className="flex-1"
								>
									<XIcon className="size-4 mr-1" />
									Decline
								</Button>
							</div>
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}
