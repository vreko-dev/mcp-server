import { Skeleton } from "@ui/components/skeleton";

export default function Loading() {
	return (
		<div className="space-y-6 p-6">
			<Skeleton className="h-8 w-48" />
			<div className="space-y-4">
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
			<Skeleton className="h-10 w-32" />
		</div>
	);
}
