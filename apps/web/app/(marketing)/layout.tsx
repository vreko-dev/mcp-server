// Import the marketing components instead of shared components

import Navbar from "@marketing/components/sections/navbar";
import { Document } from "@shared/components/Document";
import type { PropsWithChildren } from "react";
import Footer from "@/components/layout/Footer";

export default async function MarketingLayout({ children }: PropsWithChildren) {
	return (
		<Document>
			<Navbar />
			<main className="min-h-screen relative">{children}</main>
			<Footer />
		</Document>
	);
}
