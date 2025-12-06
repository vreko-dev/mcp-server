import { Logo } from "@shared/components/Logo";
import { BookOpen, FileText, Github, MessageSquare, Shield } from "lucide-react";
import Link from "next/link";
import { marketingConfig } from "../../config";

/**
 * Documentation-specific footer component
 * Matches the dark sidebar aesthetic with terminal-inspired design
 * Non-collapsible static positioning to prevent layout shifts
 */
export function DocsFooter() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="border-t border-snapback-border bg-snapback-surface/50 backdrop-blur-sm mt-16">
			<div className="mx-auto max-w-[1400px] px-6 py-12">
				{/* Main Footer Content */}
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
					{/* Brand Section */}
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<Logo className="h-8 w-8 opacity-90" />
							<span className="text-lg font-semibold text-foreground">{marketingConfig.appName}</span>
						</div>
						<p className="text-sm text-muted-foreground leading-relaxed">
							AI-aware code protection system. Protecting developers from AI mistakes, one checkpoint at a
							time.
						</p>
						<div className="flex items-center gap-3 pt-2">
							<a
								href="https://github.com/snapback"
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground hover:text-primary transition-colors"
								aria-label="GitHub Repository"
							>
								<Github className="h-5 w-5" />
							</a>
						</div>
					</div>

					{/* Documentation Links */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
							<BookOpen className="h-4 w-4 text-primary" />
							Documentation
						</h3>
						<ul className="space-y-2.5 text-sm">
							<li>
								<a
									href="https://new-docs.snapback.dev"
									className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
								>
									Introduction
								</a>
							</li>
							<li>
								<a
									href="https://new-docs.snapback.dev/getting-started/overview"
									className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
								>
									Getting Started
								</a>
							</li>
							<li>
								<a
									href="https://new-docs.snapback.dev/architecture/overview"
									className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
								>
									Architecture
								</a>
							</li>
							<li>
								<a
									href="https://new-docs.snapback.dev/api/overview"
									className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
								>
									API Reference
								</a>
							</li>
						</ul>
					</div>

					{/* Resources */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
							<MessageSquare className="h-4 w-4 text-primary" />
							Resources
						</h3>
						<ul className="space-y-2.5 text-sm">
							<li>
								<Link
									href="/blog"
									className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
								>
									Blog
								</Link>
							</li>
							<li>
								<a
									href="https://github.com/snapback/discussions"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
								>
									Community
								</a>
							</li>
							<li>
								<Link
									href="/docs/troubleshooting/faq"
									className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
								>
									FAQ
								</Link>
							</li>
							<li>
								<a
									href="https://github.com/snapback/issues"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
								>
									Support
								</a>
							</li>
						</ul>
					</div>

					{/* Legal */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
							<Shield className="h-4 w-4 text-primary" />
							Legal
						</h3>
						<ul className="space-y-2.5 text-sm">
							<li>
								<Link
									href="/legal/privacy-policy"
									className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
								>
									Privacy Policy
								</Link>
							</li>
							<li>
								<Link
									href="/legal/terms"
									className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
								>
									Terms of Service
								</Link>
							</li>
							<li>
								<a
									href="https://github.com/snapback/security"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
								>
									Security
								</a>
							</li>
							<li>
								<a
									href="https://github.com/snapback/license"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
								>
									License
								</a>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="mt-12 pt-8 border-t border-snapback-border/50">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<p className="text-xs text-muted-foreground">
							© {currentYear} {marketingConfig.appName}. Built for developers who trust AI but verify
							results.
						</p>
						<div className="flex items-center gap-4 text-xs text-muted-foreground">
							<span className="flex items-center gap-1.5">
								<FileText className="h-3.5 w-3.5" />
								Documentation v1.0
							</span>
							<span className="hidden md:inline">•</span>
							<a href="https://new-docs.snapback.dev" className="hover:text-primary transition-colors">
								View all docs
							</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
