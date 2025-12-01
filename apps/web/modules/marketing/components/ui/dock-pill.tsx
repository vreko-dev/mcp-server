import { cn } from "@marketing/lib/utils";

interface DockPillProps {
	className?: string;
	items: string[];
}

export function DockPill({ className, items }: DockPillProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md text-xs font-medium text-white/70 shadow-lg",
				className,
			)}
		>
			{items.map((item, index) => (
				<div key={item} className="flex items-center gap-3">
					{index > 0 && <div className="w-1 h-1 rounded-full bg-white/20" />}
					<span>{item}</span>
				</div>
			))}
		</div>
	);
}
