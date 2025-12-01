import { ForgotPasswordForm } from "@saas/auth/components/ForgotPasswordForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	return {
		title: "Forgot Password",
	};
}

export default function ForgotPasswordPage() {
	return <ForgotPasswordForm />;
}
