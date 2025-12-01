"use client";
import { Logo } from "@shared/components/Logo";
import Link from "next/link";
import { useEffect, useState } from "react";
import { parseSubdomainConfig } from "@/lib/subdomain-utils";

export function HomeLink() {
	const [homeUrl, setHomeUrl] = useState("/");

	useEffect(() => {
		if (typeof window !== "undefined") {
			const host = window.location.host;
			const protocol = window.location.protocol.replace(":", "");

			// Use robust subdomain parsing (handles IPv6, proxy configs, etc.)
			const config = parseSubdomainConfig(host, protocol);

			// If on docs subdomain, link to main site
			if (config.subdomain === "docs") {
				setHomeUrl(config.homeUrl);
			} else {
				// Already on main site
				setHomeUrl("/");
			}
		}
	}, []);

	return (
		<Link href={homeUrl} className="flex items-center">
			<Logo withLabel={true} />
		</Link>
	);
}

// A version of HomeLink that doesn't render an anchor tag for use in DocsLayout
export function HomeLinkTitle() {
	return <Logo wordmark={true} withLabel={false} />;
}

// A version that provides the URL for DocsLayout to use
export function getHomeUrl() {
	if (typeof window !== "undefined") {
		const host = window.location.host;
		const protocol = window.location.protocol.replace(":", "");

		// Use robust subdomain parsing (handles IPv6, proxy configs, etc.)
		const config = parseSubdomainConfig(host, protocol);

		// If on docs subdomain, return main site URL
		if (config.subdomain === "docs") {
			return config.homeUrl;
		}
	}
	// Default to root
	return "/";
}
