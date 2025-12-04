"use client";

import { useSession } from "@saas/auth/hooks/use-session";
import {
	fullOrganizationQueryKey,
	useFullOrganizationQuery,
} from "@saas/organizations/lib/api";
// Note: ActiveOrganization type is available from @snapback/auth if needed
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { Button } from "@ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { Table, TableBody, TableCell, TableRow } from "@ui/components/table";
import { cn } from "@ui/lib";
import {
	CheckIcon,
	ClockIcon,
	MailXIcon,
	MoreVerticalIcon,
	XIcon,
} from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { isOrganizationAdmin } from "@/lib/auth/helpers";
import { OrganizationRoleSelect } from "./OrganizationRoleSelect";
export function OrganizationInvitationsList({
	organizationId,
}: {
	organizationId: string;
}) {
	const queryClient = useQueryClient();
	const { user } = useSession();
	const { data: organization } = useFullOrganizationQuery(organizationId);

	const canUserEditInvitations = isOrganizationAdmin(organization, user);

	const invitations = useMemo(
		() =>
			(organization as any)?.invitations
				?.filter((invitation: any) => invitation.status === "pending")
				.sort(
					(a: any, b: any) =>
						new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
				),
		[(organization as any)?.invitations],
	);

	const revokeInvitation = (_invitationId: string) => {
		toast.promise(
			async () => {
				// TODO: Replace with actual auth client when backend is ready
				// const { error } = await authClient.organization.cancelInvitation({ invitationId  });
				const { error } = { error: null };

				if (error) {
					throw error;
				}
			},
			{
				loading: "Revoking invitation...",
				success: () => {
					queryClient.invalidateQueries({
						queryKey: fullOrganizationQueryKey(organizationId),
					});
					return "Invitation revoked successfully";
				},
				error: "Failed to revoke invitation",
			},
		);
	};

	// biome-ignore lint/suspicious/noExplicitAny: ActiveOrganization type not yet exported from auth package
	const columns: ColumnDef<any>[] = [
		{
			accessorKey: "email",
			accessorFn: (row) => row.email,
			cell: ({ row }) => {
				const InvitationStatusIcon = {
					pending: ClockIcon,
					accepted: CheckIcon,
					rejected: XIcon,
					canceled: XIcon,
				}[
					row.original.status as
						| "pending"
						| "accepted"
						| "rejected"
						| "canceled"
				];
				return (
					<div className="leading-normal">
						<strong
							className={cn("block", {
								"opacity-50": row.original.status === "canceled",
							})}
						>
							{row.original.email}
						</strong>
						<small className="flex flex-wrap gap-1 text-foreground/60">
							<span className="flex items-center gap-0.5">
								<InvitationStatusIcon className="size-3" />
								{row.original.status.charAt(0).toUpperCase() +
									row.original.status.slice(1)}
							</span>
							<span>-</span>
							<span>
								Expires:{" "}
								{new Intl.DateTimeFormat("en-US", {
									dateStyle: "medium",
									timeStyle: "short",
								}).format(new Date(row.original.expiresAt))}
							</span>
						</small>
					</div>
				);
			},
		},
		{
			accessorKey: "actions",
			cell: ({ row }) => {
				const isPending = row.original.status === "pending";

				return (
					<div className="flex flex-row justify-end gap-2">
						<OrganizationRoleSelect
							value={row.original.role}
							disabled
							onSelect={() => {
								return;
							}}
						/>

						{canUserEditInvitations && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button size="icon" variant="ghost">
										<MoreVerticalIcon className="size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuItem
										disabled={!isPending}
										onClick={() => revokeInvitation(row.original.id)}
									>
										<MailXIcon className="mr-2 size-4" />
										Revoke Invitation
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				);
			},
		},
	];

	const table = useReactTable({
		data: invitations ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	return (
		<div className="rounded-md border">
			<Table>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() && "selected"}
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center">
								No pending invitations
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
