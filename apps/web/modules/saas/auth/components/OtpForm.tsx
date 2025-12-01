"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthErrorMessages } from "@saas/auth/hooks/errors-messages";
import { useRouter } from "@shared/hooks/router";
import { Alert, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "@ui/components/input-otp";
import { AlertTriangleIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { authConfig } from "../config";

const formSchema = z.object({
	code: z.string().min(6).max(6),
});

type FormValues = z.infer<typeof formSchema>;

export function OtpForm() {
	const router = useRouter();
	const { getAuthErrorMessage } = useAuthErrorMessages();
	const searchParams = useSearchParams();

	const invitationId = searchParams.get("invitationId");
	const redirectTo = searchParams.get("redirectTo");

	const redirectPath = invitationId
		? `/organization-invitation/${invitationId}`
		: (redirectTo ?? authConfig.redirectAfterSignIn);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			code: "",
		},
	});

	const onSubmit = form.handleSubmit(async ({ code: _code }) => {
		try {
			// TODO: Replace with actual auth client when backend is ready
			// const { error } = await authClient.twoFactor.verifyTotp({ code: otp });
			const { error } = { error: null };

			if (error) {
				throw error;
			}

			router.replace(redirectPath);
		} catch (e) {
			form.setError("root", {
				message: getAuthErrorMessage(
					e && typeof e === "object" && "code" in e
						? (e.code as string)
						: undefined,
				),
			});
		}
	});

	return (
		<>
			<h1 className="font-bold text-xl md:text-2xl">Verify your code</h1>
			<p className="mt-1 mb-4 text-foreground/60">
				Enter the verification code from your authenticator app.
			</p>

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
						name="code"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Verification Code</FormLabel>
								<FormControl>
									<InputOTP
										maxLength={6}
										{...field}
										autoComplete="one-time-code"
										onChange={(value: string) => {
											field.onChange(value);
											onSubmit();
										}}
									>
										<InputOTPGroup>
											<InputOTPSlot className="size-10 text-lg" index={0} />
											<InputOTPSlot className="size-10 text-lg" index={1} />
											<InputOTPSlot className="size-10 text-lg" index={2} />
										</InputOTPGroup>
										<InputOTPSeparator className="opacity-40" />
										<InputOTPGroup>
											<InputOTPSlot className="size-10 text-lg" index={3} />
											<InputOTPSlot className="size-10 text-lg" index={4} />
											<InputOTPSlot className="size-10 text-lg" index={5} />
										</InputOTPGroup>
									</InputOTP>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Button loading={form.formState.isSubmitting}>Verify</Button>
				</form>
			</Form>

			<div className="mt-6 text-center text-sm">
				<Link href="/auth/login">
					<ArrowLeftIcon className="mr-1 inline size-4 align-middle" />
					Back to sign in
				</Link>
			</div>
		</>
	);
}
