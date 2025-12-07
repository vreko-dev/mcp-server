"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthErrorMessages } from "@saas/auth/hooks/errors-messages";
import { authClient } from "@snapback/auth/client";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@ui/components/form";
import { Input } from "@ui/components/input";
import { AlertTriangleIcon, ArrowLeftIcon, MailboxIcon } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
	email: z.string().email(),
});

type FormValues = z.infer<typeof formSchema>;

export function ForgotPasswordForm() {
	const { getAuthErrorMessage } = useAuthErrorMessages();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});

	const onSubmit = form.handleSubmit(async (data: FormValues) => {
		try {
			// Request password reset email via Better Auth
			const { error } = await authClient.forgetPassword({
				email: data.email,
				redirectTo: `${window.location.origin}/auth/reset-password`,
			});

			if (error) {
				throw error;
			}
		} catch (e) {
			// Sanitize error message to prevent info leak
			let errorMessage = getAuthErrorMessage(
				e && typeof e === "object" && "code" in e ? (e.code as string) : undefined,
			);

			// Additional sanitization for security-sensitive errors
			if (e instanceof Error) {
				const message = e.message.toLowerCase();
				if (
					message.includes("database") ||
					message.includes("password") ||
					message.includes("pg://") ||
					message.includes("internal server")
				) {
					errorMessage = "An error occurred. Please try again or contact support.";
				}
			}

			form.setError("root", {
				message: errorMessage,
			});
		}
	});

	return (
		<>
			<h1 className="font-bold text-xl md:text-2xl">Forgot password?</h1>
			<p className="mt-1 mb-6 text-foreground/60">No worries, we'll send you reset instructions.</p>

			{form.formState.isSubmitSuccessful ? (
				<Alert variant="success">
					<MailboxIcon />
					<AlertTitle>Check your email</AlertTitle>
					<AlertDescription>We've sent you a password reset link.</AlertDescription>
				</Alert>
			) : (
				<Form {...form}>
					<form className="flex flex-col items-stretch gap-4" onSubmit={onSubmit}>
						{form.formState.errors.root && (
							<Alert variant="error">
								<AlertTriangleIcon />
								<AlertTitle>{form.formState.errors.root.message}</AlertTitle>
							</Alert>
						)}

						<FormField
							control={form.control}
							name="email"
							render={({ field }: any) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input {...field} autoComplete="email" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button loading={form.formState.isSubmitting}>Reset password</Button>
					</form>
				</Form>
			)}

			<div className="mt-6 text-center text-sm">
				<Link href="/auth/login">
					<ArrowLeftIcon className="mr-1 inline size-4 align-middle" />
					Back to sign in
				</Link>
			</div>
		</>
	);
}
