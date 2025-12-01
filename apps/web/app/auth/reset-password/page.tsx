import { ResetPasswordForm } from "@saas/auth/components/ResetPasswordForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	return {
		title: "Reset Password",
	};
}

export default function ResetPasswordPage() {
	return <ResetPasswordForm />;
}
