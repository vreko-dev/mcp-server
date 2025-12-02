import { AuthWrapper } from "@saas/shared/components/AuthWrapper";
import { Document } from "@shared/components/Document";
import { headers } from "next/headers";
import type { PropsWithChildren } from "react";

export default async function AuthLayout({ children }: PropsWithChildren) {
	const locale = "en";
	const headersList = await headers();
	const pathname = headersList.get("x-pathname") || "";

	// Skip AuthWrapper for full-screen login page
	const isFullScreenLogin = pathname === "/auth/login";

	return (
		<Document locale={locale}>
			{isFullScreenLogin ? children : <AuthWrapper>{children}</AuthWrapper>}
		</Document>
	);
}
