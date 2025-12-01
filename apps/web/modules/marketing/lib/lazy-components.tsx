import dynamic from "next/dynamic";

// Lazy load heavy components with proper SSR handling and loading states
export const LazyFooter = dynamic(
	() => import("@marketing/components/sections/footer"),
	{
		ssr: true,
		loading: () => (
			<div className="bg-gradient-to-t from-muted/20 to-background border-t border-border">
				<div className="container py-16">
					<div className="animate-pulse">
						<div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
							<div className="lg:col-span-1 space-y-4">
								<div className="h-12 w-32 bg-muted/30 rounded" />
								<div className="h-20 bg-muted/30 rounded" />
								<div className="h-10 bg-muted/30 rounded" />
							</div>
							<div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-8">
								{Array.from({ length: 4 }).map((_, i) => (
									<div key={i} className="space-y-3">
										<div className="h-6 bg-muted/30 rounded" />
										<div className="space-y-2">
											{Array.from({ length: 4 }).map((_, j) => (
												<div key={j} className="h-4 bg-muted/20 rounded" />
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		),
	},
);

export const LazyPricingSection = dynamic(
	() =>
		import("@marketing/components/sections/pricing-section").then((mod) => ({
			default: mod.PricingSection,
		})),
	{
		ssr: true,
		loading: () => (
			<section className="py-24">
				<div className="container">
					<div className="animate-pulse space-y-8">
						<div className="text-center space-y-4">
							<div className="h-12 w-64 bg-muted/30 rounded mx-auto" />
							<div className="h-6 w-96 bg-muted/20 rounded mx-auto" />
						</div>
						<div className="grid lg:grid-cols-3 gap-8">
							{Array.from({ length: 3 }).map((_, i) => (
								<div key={i} className="border rounded-xl p-6 space-y-4">
									<div className="h-8 w-24 bg-muted/30 rounded" />
									<div className="h-12 w-32 bg-muted/30 rounded" />
									<div className="space-y-2">
										{Array.from({ length: 5 }).map((_, j) => (
											<div key={j} className="h-4 bg-muted/20 rounded" />
										))}
									</div>
									<div className="h-10 bg-primary/20 rounded" />
								</div>
							))}
						</div>
					</div>
				</div>
			</section>
		),
	},
);

export const LazyProtectionPreview = dynamic(
	() =>
		import("@marketing/components/sections/protection-preview").then((mod) => ({
			default: mod.ProtectionPreview,
		})),
	{
		ssr: true,
		loading: () => (
			<section className="py-24">
				<div className="container">
					<div className="animate-pulse space-y-12">
						<div className="text-center space-y-4">
							<div className="h-12 w-80 bg-muted/30 rounded mx-auto" />
							<div className="h-6 w-96 bg-muted/20 rounded mx-auto" />
						</div>
						<div className="grid lg:grid-cols-2 gap-12">
							<div className="space-y-6">
								{Array.from({ length: 4 }).map((_, i) => (
									<div key={i} className="flex items-center space-x-4">
										<div className="h-8 w-8 bg-primary/20 rounded" />
										<div className="flex-1 space-y-2">
											<div className="h-5 bg-muted/30 rounded" />
											<div className="h-4 bg-muted/20 rounded" />
										</div>
									</div>
								))}
							</div>
							<div className="h-96 bg-muted/20 rounded-xl" />
						</div>
					</div>
				</div>
			</section>
		),
	},
);

export const LazyStoryScroll = dynamic(
	() =>
		import("@marketing/components/sections/story-scroll").then((mod) => ({
			default: mod.StoryScroll,
		})),
	{
		ssr: true,
		loading: () => (
			<section className="py-24">
				<div className="container">
					<div className="animate-pulse space-y-16">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="grid lg:grid-cols-2 gap-12 items-center">
								<div className="space-y-6">
									<div className="h-10 w-3/4 bg-muted/30 rounded" />
									<div className="space-y-3">
										<div className="h-4 bg-muted/20 rounded" />
										<div className="h-4 bg-muted/20 rounded w-5/6" />
										<div className="h-4 bg-muted/20 rounded w-4/6" />
									</div>
								</div>
								<div className="h-80 bg-muted/20 rounded-xl" />
							</div>
						))}
					</div>
				</div>
			</section>
		),
	},
);
