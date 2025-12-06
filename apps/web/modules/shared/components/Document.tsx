import { ClientProviders } from "@shared/components/ClientProviders";
import { ConsentProvider } from "@shared/components/ConsentProvider";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { PropsWithChildren } from "react";

export async function Document({ children }: PropsWithChildren<{ locale?: string }>) {
	const cookieStore = await cookies();
	const consentCookie = cookieStore.get("consent");

	return (
		<NuqsAdapter>
			<ConsentProvider initialConsent={consentCookie?.value === "true"}>
				<ClientProviders>{children}</ClientProviders>
			</ConsentProvider>
		</NuqsAdapter>
	);
}
