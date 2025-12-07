"use client";
import { useUserPasskeysQuery } from "@saas/auth/lib/api";
import { SettingsItem } from "@saas/shared/components/SettingsItem";
import { authClient } from "@snapback/auth/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Skeleton } from "@ui/components/skeleton";
import { KeyIcon, PlusIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

export function PasskeysBlock() {
	const queryClient = useQueryClient();

	const { data: passkeys, isPending } = useUserPasskeysQuery();

	const addPasskey = async () => {
		try {
			await authClient.passkey.addPasskey({
				fetchOptions: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["passkeys"] }) },
			});
			toast.success("Passkey added successfully");
		} catch (_error) {
			toast.error("Failed to add passkey");
		}
	};

	const deletePasskey = (id: string) => {
		toast.promise(
			(async () => {
				await authClient.passkey.deletePasskey({ id });
				queryClient.invalidateQueries({ queryKey: ["passkeys"] });
			})(),
			{
				loading: "Deleting passkey...",
				success: "Passkey deleted successfully",
				error: "Failed to delete passkey",
			},
		);
	};

	return (
		<SettingsItem title="Passkeys" description="Manage passkeys for passwordless authentication">
			<div className="grid grid-cols-1 gap-2">
				{isPending ? (
					<div className="flex gap-2">
						<Skeleton className="size-6 shrink-0" />
						<div className="flex-1">
							<Skeleton className="mb-0.5 h-4 w-full" />
							<Skeleton className="h-8 w-full" />
						</div>
						<Skeleton className="size-9 shrink-0" />
					</div>
				) : (
					(passkeys as any)?.map((passkey: any) => (
						<div key={passkey.id} className="flex gap-2">
							<KeyIcon className="size-6 shrink-0 text-primary/50" />
							<div className="flex-1">
								<strong className="block text-sm">
									{passkey.deviceType} {passkey.name}
								</strong>
								<small className="block text-foreground/60 text-xs leading-tight">
									{new Intl.DateTimeFormat("en-US", {
										dateStyle: "medium",
										timeStyle: "short",
									}).format(new Date(passkey.createdAt))}
								</small>
							</div>
							<Button
								variant="light"
								size="icon"
								className="shrink-0"
								onClick={() => deletePasskey(passkey.id)}
							>
								<TrashIcon className="size-4" />
							</Button>
						</div>
					))
				)}

				<div className="flex justify-start">
					<Button variant="light" onClick={addPasskey}>
						<PlusIcon className="mr-1.5 size-4" />
						Add passkey
					</Button>
				</div>
			</div>
		</SettingsItem>
	);
}
