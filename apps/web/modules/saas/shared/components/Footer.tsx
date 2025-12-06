import { cn } from "@ui/lib";
import Link from "next/link";

export function Footer() {
	return (
		<footer className={cn("container max-w-6xl py-6 text-center text-foreground/60 text-xs")}>
			<span>© {new Date().getFullYear()} SnapBack. All rights reserved.</span>
			<span className="opacity-50"> | </span>
			<Link href="/legal/privacy-policy">Privacy policy</Link>
			<span className="opacity-50"> | </span>
			<Link href="/legal/terms">Terms and conditions</Link>
		</footer>
	);
}
