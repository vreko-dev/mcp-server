import { OtpForm } from "@saas/auth/components/OtpForm";
import { MagicLinkVerifyForm } from "@saas/onboarding/components/MagicLinkVerifyForm";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	return {
		title: "Verify",
	};
}

/**
 * Unified verification page that handles:
 * - Magic link verification (token in URL)
 * - OTP/2FA verification (when user is prompted for code)
 *
 * Per /apps/onboarding/implementation.md:
 * GET /auth/verify?token=... handles magic link verification
 */
function VerifyContent({ searchParams }: { searchParams: URLSearchParams }) {
	// If token is present, this is a magic link verification
	const token = searchParams.get("token");

	if (token) {
		return <MagicLinkVerifyForm />;
	}

	// Otherwise, show OTP form for 2FA
	return <OtpForm />;
}

export default function VerifyPage({
	searchParams,
}: {
	searchParams: { [key: string]: string | string[] | undefined };
}) {
	// Convert searchParams to URLSearchParams for the client component
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(searchParams)) {
		if (typeof value === "string") {
			params.set(key, value);
		}
	}

	return (
		<Suspense
			fallback={
				<div className="flex justify-center py-12">
					<span className="animate-spin">⏳</span>
				</div>
			}
		>
			<VerifyContent searchParams={params} />
		</Suspense>
	);
}
