"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { KeyIcon, PlusIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { apiClient as api } from "@/lib/api-client";

export function CreateApiKeyDialog({ onKeyCreated }: { onKeyCreated?: () => void }) {
	const [isPending, startTransition] = useTransition();

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		startTransition(async () => {
			try {
				const formData = new FormData(e.currentTarget);
				const name = formData.get("name") as string;

				const response = await api.apiKeys.create({
					name,
				});

				if (response.error) {
					throw new Error(response.error.message);
				}

				toast.success("API key created successfully");
				if (onKeyCreated) {
					onKeyCreated();
				}
			} catch (error) {
				toast.error("Failed to create API key", {
					description: error instanceof Error ? error.message : "Unknown error",
				});
			}
		});
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button size="sm">
					<PlusIcon className="h-4 w-4 mr-2" />
					Create Key
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<KeyIcon className="h-5 w-5" />
							Create API Key
						</DialogTitle>
						<DialogDescription>Create a new API key to authenticate with SnapBack tools.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="name" className="text-right">
								Name
							</Label>
							<Input id="name" name="name" defaultValue="Default Key" className="col-span-3" required />
						</div>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Creating..." : "Create API Key"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
