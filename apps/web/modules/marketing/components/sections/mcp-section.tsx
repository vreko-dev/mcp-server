"use client";

import { Button } from "@ui/components/button";
import { motion } from "motion/react";
import Link from "next/link";
import { ProtectiveHover } from "../ui/snap-motion";
import { ComingSoonBadge } from "@marketing/components/ui/coming-soon-badge";

export function MCPSection() {
	return (
		<section className="py-24 bg-gradient-to-b from-slate-900 to-black border-y border-gray-800">
			<div className="max-w-7xl mx-auto px-4">
				<div className="text-center mb-16">
					<div className="flex items-center justify-center gap-3 mb-6">
						<motion.h2
							className="text-4xl md:text-6xl font-bold text-white"
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5 }}
						>
							For MCP Users
						</motion.h2>
						<ComingSoonBadge />
					</div>
					<motion.p
						className="text-xl text-gray-300 max-w-3xl mx-auto"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.1 }}
					>
						Prefer the Model Context Protocol? Our MCP server will integrate
						with Claude Desktop and support all the same features (coming soon).
					</motion.p>
				</div>

				<div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
					>
						<h3 className="text-2xl font-bold text-white mb-4">MCP Server</h3>
						<p className="text-gray-300 mb-6">
							Our MCP server will provide the same powerful SnapBack protection
							through the Model Context Protocol, allowing seamless integration
							with Claude Desktop and other MCP-compatible tools.
						</p>
						<ul className="space-y-3 mb-8">
							<li className="flex items-start">
								<span className="text-[#10B981] mr-2 mt-1">✓</span>
								<span className="text-gray-300">
									Full API parity with VSCode extension
								</span>
							</li>
							<li className="flex items-start">
								<span className="text-[#10B981] mr-2 mt-1">✓</span>
								<span className="text-gray-300">
									Automatic checkpoint detection
								</span>
							</li>
							<li className="flex items-start">
								<span className="text-[#10B981] mr-2 mt-1">✓</span>
								<span className="text-gray-300">
									One-click recovery from Claude Desktop
								</span>
							</li>
							<li className="flex items-start">
								<span className="text-[#10B981] mr-2 mt-1">✓</span>
								<span className="text-gray-300">Enterprise-grade security</span>
							</li>
						</ul>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, x: 20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
						className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6"
					>
						<h3 className="text-xl font-bold text-white mb4">Get Started</h3>
						<p className="text-gray-300 text-sm mb-4">
							Install our MCP server with npm (coming soon):
						</p>
						<div className="bg-black rounded-lg p-4 mb-6">
							<code className="text-green-400 text-sm">
								npm install -g @snapback/mcp-server
							</code>
						</div>
						<ProtectiveHover intensity="subtle" protectionGlow>
							<Button
								asChild
								className="w-full bg-gradient-to-r from-[#FF6B35] to-[#EF4444] text-white hover:shadow-lg hover Shadow-[#FF6B35]/30"
								disabled
							>
								<Link href="https://github.com/snapback/mcp-server">
									View MCP Server (Coming Soon)
								</Link>
							</Button>
						</ProtectiveHover>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
