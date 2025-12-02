import { getSession } from "@saas/auth/lib/server";
import { OnboardingForm } from "@saas/onboarding/components/OnboardingForm";
import { AuthWrapper } from "@saas/shared/components/AuthWrapper";
import { redirect } from "next/navigation";

// TODO: Replace with actual config from environment/app settings
const config = {
	users: {
		enableOnboarding: true,
	},
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	return {
		title: "Onboarding",
	};
}

export default async function OnboardingPage() {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	// STUB: In frontend-only mode, session is null, so always allow onboarding
	const sessionData = session as any || {};
	if (!config.users.enableOnboarding || sessionData?.user?.onboardingComplete) {
		redirect("/app");
	}

	return (
		<AuthWrapper>
			<OnboardingForm />
		</AuthWrapper>
	);
}
