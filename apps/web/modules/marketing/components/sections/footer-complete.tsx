"use client";
import { m } from "motion/react";
import { useEffect, useState } from "react";

export function FooterComplete() {
	// Helper to get docs URL for subdomain routing (hydration-safe)
	const [docsUrl, setDocsUrl] = useState("/docs"); // Default to internal docs route

	useEffect(() => {
		if (typeof window !== "undefined") {
			// Check if we're in local development
			const isLocalhost =
				window.location.hostname === "localhost" ||
				window.location.hostname === "127.0.0.1";

			if (isLocalhost) {
				// For local development, use docs.localhost subdomain
				const port = window.location.port ? `:${window.location.port}` : "";
				setDocsUrl(`http://docs.localhost${port}`);
			} else {
				// For production, use the docs subdomain
				const rootDomain =
					process.env.NEXT_PUBLIC_ROOT_DOMAIN || "snapback.dev";
				setDocsUrl(`https://new-docs.${rootDomain}`);
			}
		}
	}, []);

	const footerLinks = {
		Product: [
			{ name: "Features", href: "#features" },
			{ name: "Pricing", href: "#pricing" },
			{ name: "Changelog", href: "/changelog" },
			{ name: "Status", href: "/status" },
		],
		Resources: [
			{ name: "Docs", href: docsUrl },
			{ name: "Blog", href: "/blog" },
			{ name: "API", href: "/api" },
			{ name: "Support", href: "/support" },
		],
		Company: [
			{ name: "About", href: "/about" },
			{ name: "Careers", href: "/careers" },
			{ name: "Brand", href: "/brand" },
			{ name: "Contact", href: "/contact" },
		],
		Legal: [
			{ name: "Privacy", href: "/privacy" },
			{ name: "Terms", href: "/terms" },
			{ name: "Security", href: "/security" },
			{ name: "Cookies", href: "/cookies" },
		],
	};

	const socialLinks = [
		{
			name: "Twitter",
			href: "https://twitter.com/snapbackdev",
			icon: <IconTwitter />,
		},
		{
			name: "GitHub",
			href: "https://github.com/snapback",
			icon: <IconGitHub />,
		},
		{
			name: "Discord",
			href: "https://discord.gg/SF6Vcjzj",
			icon: <IconDiscord />,
		},
		{
			name: "LinkedIn",
			href: "https://linkedin.com/company/snapback",
			icon: <IconLinkedIn />,
		},
	];

	return (
		<footer className="bg-snapback-black border-t border-border/50">
			<div className="container mx-auto py-16">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
					{/* Logo and description */}
					<div className="lg:col-span-2">
						<m.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
						>
							<div className="flex items-center space-x-4 mb-6">
								<div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center">
									<svg
										width="48"
										height="48"
										viewBox="0 0 24 24"
										fill="none"
										className="text-black"
									>
										<path
											d="M12 2L15.09 8.26L22 9L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9L8.91 8.26L12 2Z"
											fill="currentColor"
										/>
									</svg>
								</div>
								<span className="text-3xl font-bold text-white">SnapBack</span>
							</div>
							<p className="text-muted-foreground mb-6 max-w-sm">
								Visual protection for every file. AI-aware checkpoints. Instant
								recovery.
							</p>

							{/* Social links */}
							<div className="flex space-x-4">
								{socialLinks.map((link, index) => (
									<m.a
										key={link.name}
										href={link.href}
										target="_blank"
										rel="noopener noreferrer"
										className="w-10 h-10 bg-muted/20 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/20 transition-colors"
										whileHover={{ scale: 1.1, rotate: 5 }}
										whileTap={{ scale: 0.95 }}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.1 * index }}
									>
										{link.icon}
									</m.a>
								))}
							</div>
						</m.div>
					</div>

					{/* Footer links */}
					{Object.entries(footerLinks).map(
						([category, links], categoryIndex) => (
							<m.div
								key={category}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									delay: 0.1 * (categoryIndex + 1),
								}}
							>
								<h3 className="text-white font-semibold mb-4">{category}</h3>
								<ul className="space-y-2">
									{links.map((link) => (
										<li key={link.name}>
											<a
												href={link.href}
												className="text-muted-foreground hover:text-primary transition-colors text-sm"
											>
												{link.name}
											</a>
										</li>
									))}
								</ul>
							</m.div>
						),
					)}
				</div>

				{/* Bottom section */}
				<m.div
					className="border-t border-border/50 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.5 }}
				>
					<p className="text-muted-foreground text-sm">
						© 2025 SnapBack. All rights reserved.
					</p>

					<div className="flex items-center space-x-6 mt-4 md:mt-0">
						<div className="flex items-center space-x-2">
							<div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
							<span className="text-xs text-muted-foreground">
								All systems operational
							</span>
						</div>
						<span className="text-xs text-muted-foreground">
							Made with ❤️ for developers
						</span>
					</div>
				</m.div>
			</div>
		</footer>
	);
}

// Social media icons
const IconTwitter = () => (
	<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
		<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
	</svg>
);

const IconGitHub = () => (
	<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
		<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
	</svg>
);

const IconDiscord = () => (
	<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
		<path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z" />
	</svg>
);

const IconLinkedIn = () => (
	<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
		<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
	</svg>
);
