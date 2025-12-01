"use client";

import Footer from "@marketing/components/sections/footer";
import { usePathname } from "next/navigation";

export function ConditionalFooter() {
	const pathname = usePathname();
	const isDocsPage = pathname?.includes("/docs");

	if (isDocsPage) {
		return null;
	}

	return <Footer />;
}
