import { SignupForm } from "@saas/auth/components/SignupForm";
import { getInvitation } from "@saas/auth/lib/server";
import { redirect } from "next/navigation";
import { withQuery } from "ufo";
import { authConfig } from "@saas/auth/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	return {
		title: "Sign Up",
	};
}
export default async function SignupPage({
	searchParams,
}: {
	searchParams: Promise<{
		[key: string]: string | string[] | undefined;
		invitationId?: string;
	}>;
}) {
	const params = await searchParams;
	const { invitationId } = params;

	if (!(authConfig.enableSignup || invitationId)) {
		redirect(withQuery("/auth/login", params));
	}

	if (invitationId) {
		const invitation = (await getInvitation(invitationId)) as any;

		if (
			!invitation ||
			invitation?.status !== "pending" ||
			invitation?.expiresAt?.getTime() < Date.now()
		) {
			redirect(withQuery("/auth/login", params));
		}

		return <SignupForm prefillEmail={invitation?.email} />;
	}

	return <SignupForm />;
}
