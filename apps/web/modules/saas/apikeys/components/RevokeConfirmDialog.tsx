"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@ui/components/alert-dialog";
import { Button } from "@ui/components/button";
import { AlertTriangle, Trash2 } from "lucide-react";

interface RevokeConfirmDialogProps {
	keyName: string;
	onConfirm: () => void;
	disabled?: boolean;
}

export function RevokeConfirmDialog({ keyName, onConfirm, disabled = false }: RevokeConfirmDialogProps) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					disabled={disabled}
					className="text-[var(--snapback-danger)] border-[var(--snapback-danger)]/30 hover:bg-[var(--snapback-danger)]/10"
				>
					<Trash2 className="h-4 w-4" />
					Revoke
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-[var(--snapback-danger)]" />
						Are you sure?
					</AlertDialogTitle>
					<AlertDialogDescription className="space-y-2">
						<p>
							This will revoke the API key <strong>"{keyName}"</strong>.
						</p>
						<p className="text-[var(--snapback-danger)]">
							This action cannot be undone. Any tools using this key will stop working immediately.
						</p>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="bg-[var(--snapback-danger)] hover:bg-[var(--snapback-danger)]/90"
					>
						Confirm Revoke
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
