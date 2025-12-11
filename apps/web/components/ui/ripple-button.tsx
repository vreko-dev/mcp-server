import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RippleButtonProps {
	href?: string;
	children: React.ReactNode;
	className?: string;
	size?: "sm" | "md" | "lg";
}

export function RippleButton({ href, children, className, size = "md" }: RippleButtonProps) {
	const Comp = href ? Link : "button";
	const props = href ? { href } : {};

	return (
		<Button variant="primary" size={size} className={cn("relative overflow-hidden", className)} asChild={!!href}>
			<Comp {...props}>{children}</Comp>
		</Button>
	);
}
