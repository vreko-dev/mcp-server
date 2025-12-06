"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "@saas/auth/hooks/use-session";
import { UserAvatarUpload } from "@saas/settings/components/UserAvatarUpload";
import { Button } from "@ui/components/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@ui/components/form";
import { Input } from "@ui/components/input";
import { ArrowRightIcon } from "lucide-react";
import { useEffect } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
	name: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function OnboardingStep1({ onCompleted }: { onCompleted: () => void }) {
	const { user } = useSession();
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: user?.name ?? "",
		},
	});

	useEffect(() => {
		if (user) {
			form.setValue("name", user.name ?? "");
		}
	}, [user]);

	const onSubmit: SubmitHandler<FormValues> = async (_formData) => {
		form.clearErrors("root");

		try {
			// TODO: Replace with actual auth client when backend is ready
			// const { name } = _formData;
			// await authClient.updateUser({ name });
			await Promise.resolve(); // Stub for auth client

			onCompleted();
		} catch {
			form.setError("root", {
				type: "server",
				message: "Failed to set up your account. Please try again.",
			});
		}
	};

	return (
		<div>
			<Form {...form}>
				<form className="flex flex-col items-stretch gap-8" onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
							</FormItem>
						)}
					/>

					<FormItem className="flex items-center justify-between gap-4">
						<div>
							<FormLabel>Avatar</FormLabel>

							<FormDescription>Upload a profile picture (optional)</FormDescription>
						</div>
						<FormControl>
							<UserAvatarUpload
								onSuccess={() => {
									return;
								}}
								onError={() => {
									return;
								}}
							/>
						</FormControl>
					</FormItem>

					<Button type="submit" loading={form.formState.isSubmitting}>
						Continue
						<ArrowRightIcon className="ml-2 size-4" />
					</Button>
				</form>
			</Form>
		</div>
	);
}
