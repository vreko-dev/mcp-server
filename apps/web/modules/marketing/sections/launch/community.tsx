"use client";

import { motion as m } from "motion/react";
import { MessageCircle, BookOpen, Github, Video } from "lucide-react";
import Link from "next/link";

interface CommunityOption {
	icon: React.ReactNode;
	title: string;
	description: string;
	href: string;
	cta: string;
}

const communityOptions: CommunityOption[] = [
	{
		icon: <MessageCircle className="w-6 h-6" />,
		title: "Discord",
		description:
			"Join 200+ developers discussing AI safety and testing builds",
		href: "https://discord.gg/snapback",
		cta: "Join Discord →",
	},
	{
		icon: <BookOpen className="w-6 h-6" />,
		title: "Dev Blog",
		description: "Weekly updates on what we're building and why",
		href: "/blog",
		cta: "Read the Blog →",
	},
	{
		icon: <Github className="w-6 h-6" />,
		title: "GitHub",
		description:
			"Open issues, feature requests, and full source transparency",
		href: "https://github.com/snapback",
		cta: "View Repository →",
	},
	{
		icon: <Video className="w-6 h-6" />,
		title: "Office Hours",
		description: "Monthly video calls with the team. Ask anything.",
		href: "/office-hours",
		cta: "Next: Jan 15 →",
	},
];

export function Community() {
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.15,
				delayChildren: 0,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.6 },
		},
	};

	return (
		<section className="py-24 bg-[#0A0A0A] relative overflow-hidden">
			<div className="container mx-auto px-4">
				{/* Header */}
				<div className="text-center mb-20 space-y-4">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-medium uppercase tracking-wider">
						Build With Us
					</div>
					<h2 className="text-3xl lg:text-5xl font-bold text-white">
						We're Building This in Public
					</h2>
					<p className="text-lg text-[#A0A0A0] max-w-2xl mx-auto">
						No stealth mode. No surprise launches. Just honest development
						with community input.
					</p>
				</div>

				{/* Community Grid */}
				<m.div
					className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
					variants={containerVariants}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-100px" }}
				>
					{communityOptions.map((option, index) => (
						<m.div key={index} variants={itemVariants}>
							<Link href={option.href} target="_blank" rel="noopener">
								<div className="group p-8 rounded-xl border border-[#262626] bg-[#111111] hover:bg-[#171717] hover:border-[#404040] transition-all h-full flex flex-col gap-4 cursor-pointer">
									{/* Icon */}
									<div className="text-[#A0A0A0] group-hover:text-[#10B981] transition-colors">
										{option.icon}
									</div>

									{/* Title */}
									<h3 className="text-xl font-bold text-white">
										{option.title}
									</h3>

									{/* Description */}
									<p className="text-[#A0A0A0] text-sm flex-grow">
										{option.description}
									</p>

									{/* CTA */}
									<div className="text-sm font-medium text-[#10B981] group-hover:text-[#34D399] transition-colors">
										{option.cta}
									</div>
								</div>
							</Link>
						</m.div>
					))}
				</m.div>
			</div>
		</section>
	);
}
