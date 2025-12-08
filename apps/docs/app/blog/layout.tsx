import { HomeLinkTitle } from "@/components/HomeLink";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
	const homeUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev";

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-white/10 sticky top-0 bg-background/80 backdrop-blur-sm z-50">
				<div className="container max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between">
					<a href={homeUrl} className="flex items-center gap-2">
						<HomeLinkTitle />
					</a>
					<nav className="flex items-center gap-6">
						<a href="/" className="text-sm hover:text-blue-400 transition-colors">
							Docs
						</a>
						<a href="/blog" className="text-sm text-blue-400">
							Blog
						</a>
					</nav>
				</div>
			</header>
			<main>{children}</main>
		</div>
	);
}
