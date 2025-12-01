"use client";
// import { ASSETS } from "@marketing/lib/assets"
import { Logo } from "@shared/components/Logo";
import { Github, Linkedin, Twitter } from "lucide-react";
import { m } from "motion/react";
// import Image from "next/image"
import { useEffect, useState } from "react";

const Footer = () => {
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const links = {
		product: [
			{ name: "Features", href: "#" },
			{ name: "Pricing", href: "#pricing" },
			{ name: "Integrations", href: "#" },
		],
		company: [
			{ name: "About", href: "#" },
			{ name: "Blog", href: "/blog" },
			{ name: "Careers", href: "#" },
		],
		developers: [
			{ name: "Documentation", href: "https://docs.snapback.dev" },
			{ name: "API Reference", href: "#" },
			{ name: "Community", href: "#" },
			{ name: "Support", href: "#" },
		],
		legal: [
			{ name: "Privacy", href: "/privacy" },
			{ name: "Terms", href: "/terms" },
			{ name: "Security", href: "#" },
		],
	};

	const socialLinks = [
		{ icon: Github, href: "#", label: "GitHub" },
		{ icon: Twitter, href: "#", label: "Twitter" },
		{ icon: Linkedin, href: "#", label: "LinkedIn" },
	];

	return (
		<footer className="bg-gradient-to-t from-muted/20 to-background border-t border-border">
			<div className="container py-16">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
					{/* Brand Section */}
					<m.div
						className="lg:col-span-1"
						initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
					>
						<div className="mb-6">
							<Logo withLabel={true} />
						</div>
						<p className="text-muted-foreground mb-6 max-w-sm text-sm leading-relaxed">
							Ship fast. Break things.{" "}
							<span className="text-[#00FF41] font-semibold">SnapBack</span>{" "}
							instantly. Your AI-proof safety net for fearless development.
						</p>

						{/* Social Links */}
						<div className="flex space-x-4">
							{socialLinks.map((social) => (
								<m.a
									key={social.label}
									href={social.href}
									className="p-2 text-muted-foreground hover:text-foreground transition-colors"
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.95 }}
									aria-label={social.label}
								>
									<social.icon className="h-5 w-5" />
								</m.a>
							))}
						</div>
					</m.div>

					{/* Links Sections */}
					<div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-8">
						{Object.entries(links).map(([category, categoryLinks], index) => (
							<m.div
								key={category}
								initial={
									isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }
								}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{
									duration: 0.6,
									delay: index * 0.1,
								}}
								viewport={{ once: true }}
							>
								<h4 className="font-semibold mb-4 capitalize">{category}</h4>
								<ul className="space-y-3">
									{categoryLinks.map((link) => (
										<li key={link.name}>
											<a
												href={link.href}
												className="text-muted-foreground hover:text-foreground transition-colors text-sm"
											>
												{link.name}
											</a>
										</li>
									))}
								</ul>
							</m.div>
						))}
					</div>

					{/* Newsletter Signup - Moved to right */}
					<m.div
						className="lg:col-span-1"
						initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.4 }}
						viewport={{ once: true }}
					>
						<h4 className="font-semibold mb-4">Stay updated</h4>
						<div className="flex flex-col gap-2">
							<input
								type="email"
								placeholder="Enter your email"
								className="flex-1 px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
							/>
							<m.button
								className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
							>
								Subscribe
							</m.button>
						</div>
					</m.div>
				</div>

				{/* Bottom Bar */}
				<m.div
					className="pt-8 mt-16 border-t border-border"
					initial={isMounted ? { opacity: 0 } : { opacity: 1 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.6, delay: 0.4 }}
					viewport={{ once: true }}
				>
					<div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
						<div className="flex items-center space-x-4 text-sm text-muted-foreground">
							<span>© 2025 Marcelle Labs. All rights reserved.</span>
						</div>

						<div className="text-sm flex items-center gap-2">
							<div className="text-muted-foreground">Code Breaks.</div>
							<div className="text-[#00FF41] font-semibold">SnapBack</div>
							<span className="text-[#3B82F6] font-bold">🧢</span>
						</div>
					</div>
				</m.div>
			</div>
		</footer>
	);
};

export default Footer;
