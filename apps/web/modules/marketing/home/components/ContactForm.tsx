"use client";

import { zodResolver } from "@hookform/resolvers/zod";

// TODO: import types from @snapback/api/modules/contact/types when ready

// import {
// 	type ContactFormValues,
// 	contactFormSchema,
// } from "@snapback/api/modules/contact/types";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

// Temporary inline schema - move to @snapback/api/modules/contact/types when ready
const contactFormSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Invalid email address"),
	message: z.string().min(1, "Message is required"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

import { Alert, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@ui/components/form";
import { Input } from "@ui/components/input";
import { Textarea } from "@ui/components/textarea";
import { MailCheckIcon, MailIcon } from "lucide-react";
import { useForm } from "react-hook-form";

export function ContactForm() {
	// Contact form mutation - TODO: integrate with ORPC when available
	const contactFormMutation = useMutation({
		mutationFn: async (data: ContactFormValues) => {
			// Stub implementation
			console.log("Contact form submitted", data);
			return { success: true };
		},
	});

	const form = useForm<ContactFormValues>({
		resolver: zodResolver(contactFormSchema),
		defaultValues: {
			name: "",
			email: "",
			message: "",
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		try {
			await contactFormMutation.mutateAsync(values);
		} catch {
			form.setError("root", {
				message: "Failed to send message. Please try again.",
			});
		}
	});

	return (
		<div>
			{form.formState.isSubmitSuccessful ? (
				<Alert variant="success">
					<MailCheckIcon />
					<AlertTitle>Message sent successfully!</AlertTitle>
				</Alert>
			) : (
				<Form {...form}>
					<form onSubmit={onSubmit} className="flex flex-col items-stretch gap-4">
						{form.formState.errors.root?.message && (
							<Alert variant="error">
								<MailIcon />
								<AlertTitle>{form.formState.errors.root.message}</AlertTitle>
							</Alert>
						)}

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="message"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Message</FormLabel>
									<FormControl>
										<Textarea {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
							Send Message
						</Button>
					</form>
				</Form>
			)}
		</div>
	);
}
