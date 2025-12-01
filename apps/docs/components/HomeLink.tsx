"use client";
import Link from "next/link";

// Simple inline Logo component for docs app
function Logo({ withLabel = false, wordmark = false }: { withLabel?: boolean; wordmark?: boolean }) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-2xl">🧢</span>
			{(withLabel || wordmark) && <span className="font-bold text-lg">SnapBack</span>}
		</div>
	);
}

export function HomeLink() {
	const homeUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev";

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
	return process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev";
}
