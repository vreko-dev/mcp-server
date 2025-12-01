// Enhanced Protection Snapshot Login
// To revert to standard login: import { LoginForm } from "@saas/auth/components/LoginForm";
import ProtectionSnapshotLogin from "@saas/auth/components/ProtectionSnapshotLogin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	return {
		title: "Sign In - Protection Snapshot",
		description: "Secure authentication with SnapBack Protection",
	};
}

export default function LoginPage() {
	return <ProtectionSnapshotLogin />;
}
