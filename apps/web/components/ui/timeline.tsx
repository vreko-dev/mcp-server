import { cn } from "@/lib/utils";

export const Timeline = ({ children, className }: { children: React.ReactNode; className?: string }) => {
	return <div className={cn("w-full flex flex-col gap-4", className)}>{children}</div>;
};

export const TimelineItem = ({ children, className }: { children: React.ReactNode; className?: string }) => {
	return <div className={cn("flex gap-4 border-l-2 border-muted pl-4 relative", className)}>{children}</div>;
};

export const TimelineContent = ({ children, className }: { children: React.ReactNode; className?: string }) => {
	return <div className={cn("w-full", className)}>{children}</div>;
};
