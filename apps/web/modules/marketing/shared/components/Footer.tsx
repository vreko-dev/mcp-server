import { Logo } from "@shared/components/Logo";
import Link from "next/link";
import { appConfig } from "../../../../config";

export function Footer() {
	return (
		<footer className="border-t py-8 text-foreground/60 text-sm">
			<div className="container grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div>
					<Logo className="opacity-70 grayscale footer-logo" />
					<p className="mt-3 text-sm opacity-70">
						© {new Date().getFullYear()} {appConfig.appName}. Protecting developers
						from AI mistakes.
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<Link href="/blog" className="block">
						Blog
					</Link>

					<a href="#features" className="block">
						Features
					</a>

					<a href="/#pricing" className="block">
						Pricing
					</a>
				</div>

				<div className="flex flex-col gap-2">
					<Link href="/legal/privacy-policy" className="block">
						Privacy policy
					</Link>

					<Link href="/legal/terms" className="block">
						Terms and conditions
					</Link>
				</div>
			</div>
		</footer>
	);
}
