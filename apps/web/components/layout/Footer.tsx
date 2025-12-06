"use client";

import { Logo } from "@shared/components/Logo";
import { Github, Linkedin, Twitter } from "lucide-react";
import { snapbackColors } from "@/lib/design-system";
import { useNavigateTo } from "@/lib/routes/navigateTo";
import { getFooterRoutes } from "@/lib/routes/siteMap";

/**
 * Global Footer Component
 *
 * Features:
 * - Renders all public routes marked with inFooter: true
 * - Root-aware navigation using useNavigateTo hook
 * - Keyboard accessible with visible focus indicators
 * - Responsive grid layout
 * - Social media links with proper ARIA labels
 * - SnapBack branding and legal information
 * - Uses design system tokens for consistent styling
 *
 * @example
 * ```tsx
 * <Footer />
 * ```
 */
export default function Footer() {
	const navigateTo = useNavigateTo();
	const footerRoutes = getFooterRoutes();

	const socialLinks = [
		{
			label: "GitHub",
			href: "https://github.com/snapback",
			icon: Github,
		},
		{
			label: "Twitter",
			href: "https://twitter.com/snapbackdev",
			icon: Twitter,
		},
		{
			label: "LinkedIn",
			href: "https://linkedin.com/company/snapback",
			icon: Linkedin,
		},
	];

	return (
		<footer
			className="bg-gradient-to-t from-muted/20 to-background border-t"
			style={{
				borderColor: snapbackColors.border.DEFAULT,
				backgroundColor: snapbackColors.bg.primary,
			}}
			role="contentinfo"
		>
			<div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
					{/* Brand Section */}
					<div className="lg:col-span-1">
						<div className="mb-6">
							<div className="h-12">
								<Logo wordmark={true} withLabel={false} wordmarkSize="large" />
							</div>
						</div>
						<p
							className="mb-6 max-w-sm text-sm leading-relaxed"
							style={{ color: snapbackColors.text.secondary }}
						>
							Ship fast. Break things.{" "}
							<span className="font-semibold" style={{ color: snapbackColors.green.DEFAULT }}>
								SnapBack
							</span>{" "}
							instantly. Your AI-proof safety net for fearless development.
						</p>

						{/* Social Links */}
						<div className="flex space-x-4">
							{socialLinks.map((social) => (
								<a
									key={social.label}
									href={social.href}
									target="_blank"
									rel="noopener noreferrer"
									className="p-2 transition-colors focus:outline-none focus:ring-2 rounded-md"
									style={{
										color: snapbackColors.text.secondary,
									}}
									onMouseEnter={(e) => (e.currentTarget.style.color = snapbackColors.text.primary)}
									onMouseLeave={(e) => (e.currentTarget.style.color = snapbackColors.text.secondary)}
									aria-label={social.label}
								>
									<social.icon className="h-5 w-5" />
								</a>
							))}
						</div>
					</div>

					{/* Links Sections */}
					<div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-8">
						{footerRoutes.map((group) => (
							<div key={group.category}>
								<h4 className="font-semibold mb-4" style={{ color: snapbackColors.text.primary }}>
									{group.category}
								</h4>
								<ul className="space-y-3">
									{group.routes.map((route) => (
										<li key={route.path}>
											<button
												onClick={() => navigateTo(route.path)}
												className="transition-colors text-sm text-left focus:outline-none focus:ring-0 rounded-sm cursor-pointer"
												style={{
													color: snapbackColors.text.secondary,
												}}
												onMouseEnter={(e) =>
													(e.currentTarget.style.color = snapbackColors.text.primary)
												}
												onMouseLeave={(e) =>
													(e.currentTarget.style.color = snapbackColors.text.secondary)
												}
											>
												{route.label}
											</button>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>

					{/* Newsletter Signup */}
					<div className="lg:col-span-1">
						<h4 className="font-semibold mb-4" style={{ color: snapbackColors.text.primary }}>
							Stay updated
						</h4>
						<div className="flex flex-col gap-2">
							<input
								type="email"
								placeholder="Enter your email"
								className="flex-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 text-sm"
								style={{
									backgroundColor: snapbackColors.bg.secondary,
									borderColor: snapbackColors.border.DEFAULT,
									borderWidth: "1px",
									color: snapbackColors.text.primary,
								}}
								aria-label="Email address for newsletter"
							/>
							<button
								className="px-4 py-2 rounded-lg transition-opacity text-sm font-medium focus:outline-none focus:ring-2"
								style={{
									backgroundColor: snapbackColors.green.DEFAULT,
									color: "#000",
								}}
								onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
								onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
								aria-label="Subscribe to newsletter"
							>
								Subscribe
							</button>
						</div>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="pt-8 mt-16 border-t" style={{ borderColor: snapbackColors.border.DEFAULT }}>
					<div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8">
						<div
							className="flex items-center justify-center text-sm"
							style={{ color: snapbackColors.text.secondary }}
						>
							<span>© 2025 Marcelle Labs. All rights reserved.</span>
						</div>

						<div className="text-sm flex items-center gap-2">
							<div style={{ color: snapbackColors.text.secondary }}>Code Breaks.</div>
							<div className="font-semibold" style={{ color: snapbackColors.green.DEFAULT }}>
								SnapBack
							</div>
							<span className="font-bold">🧢</span>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
