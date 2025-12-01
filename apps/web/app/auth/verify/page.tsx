import { OtpForm } from "@saas/auth/components/OtpForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	return {
		title: "Verify",
	};
}

export default function VerifyPage() {
	return <OtpForm />;
}
