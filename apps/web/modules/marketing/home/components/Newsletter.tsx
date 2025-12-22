import { logger } from "@snapback/infrastructure";

("use client");

import { zodResolver } from "@hookform/resolvers/zod";
import { marketingAnalytics } from "@marketing/lib/track-event";

import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { CheckCircleIcon, KeyIcon } from "lucide-react";

import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
	email: z.string().email(),
});
type FormValues = z.infer<typeof formSchema>;

export function Newsletter() {
	// Newsletter mutation - TODO: integrate with ORPC when available
	const newsletterSignupMutation = useMutation({
		mutationFn: async (data: { email: string }) => {
			// Stub implementation
			logger.info("Newsletter subscription", data);
			return { success: true };
		},
	});

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
	});

	const onSubmit = form.handleSubmit(async ({ email }) => {
		try {
			await newsletterSignupMutation.mutateAsync({ email });
			const domain = email.split("@")[1] ?? "unknown";
			marketingAnalytics.newsletterSubscribed(domain);
		} catch {
			form.setError("email", {
				message: "Failed to subscribe. Please try again.",
			});
		}
	});

	return (
		<section id="newsletter" className="py-16 scroll-mt-20">
			<div className="container">
				<div className="mb-8 text-center">
					<KeyIcon className="mx-auto mb-3 size-8 text-primary" />
					<h1 className="font-bold text-3xl lg:text-4xl">Stay updated on AI protection</h1>
					<p className="mt-3 text-lg opacity-70">
						Join our newsletter to get tips on protecting your code from AI mistakes and early access to new
						features.
					</p>
				</div>

				<div className="mx-auto max-w-lg">
					{form.formState.isSubmitSuccessful ? (
						<Alert variant="success">
							<CheckCircleIcon />
							<AlertTitle>Successfully subscribed!</AlertTitle>
							<AlertDescription>Thank you for subscribing to our newsletter.</AlertDescription>
						</Alert>
					) : (
						<form onSubmit={onSubmit}>
							<div className="flex items-start">
								<Input
									type="email"
									required
									placeholder="your.email@example.com"
									{...form.register("email")}
								/>

								<Button type="submit" className="ml-4" loading={form.formState.isSubmitting}>
									Subscribe
								</Button>
							</div>
							{form.formState.errors.email && (
								<p className="mt-1 text-destructive text-xs">{form.formState.errors.email.message}</p>
							)}
						</form>
					)}
				</div>
			</div>
		</section>
	);
}
