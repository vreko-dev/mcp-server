"use client";
import Link from "next/link";
import { captureDocsEvent } from "@/lib/analytics";
import type { Tier } from "./tier-context";

interface CTAUpgradeProps {
	targetTier: Exclude<Tier, "all">;
	featureName: string;
	ctaText?: string;
}

export function CTAUpgrade({ targetTier, featureName, ctaText }: CTAUpgradeProps) {
	const defaultText = `Upgrade to ${targetTier.charAt(0).toUpperCase() + targetTier.slice(1)}`;

	const handleClick = () => {
		if (typeof window !== "undefined") {
			captureDocsEvent({
				name: "docs_cta_click",
				props: {
					feature_name: featureName,
					target_tier: targetTier,
					source_page: window.location.pathname,
					cta_text: ctaText || defaultText,
				},
			});
		}
	};

	return (
		<Link
			href={`/plans-limits#${targetTier}`}
			onClick={handleClick}
			className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
		>
			{ctaText || defaultText}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M5 12h14" />
				<path d="m12 5 7 7-7 7" />
			</svg>
		</Link>
	);
}
