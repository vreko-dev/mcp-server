import { cn } from "@/lib/utils";

export function BorderBeam({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"absolute inset-0 rounded-inherit border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]",
				className,
			)}
		/>
	);
}
