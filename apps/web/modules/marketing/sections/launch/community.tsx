"use client";

import { useReducedMotion } from "@ui/hooks/use-reduced-motion";
import {
	BookOpen,
	Github as GithubIcon,
	MessageCircle,
	Video,
} from "lucide-react";
import { motion as m } from "motion/react";
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
		description: "Join 200+ developers discussing AI safety and testing builds",
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
		icon: <GithubIcon className="w-6 h-6" />,
		title: "GitHub",
		description: "Open issues, feature requests, and full source transparency",
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
	const prefersReducedMotion = useReducedMotion();

	const containerVariants = {
		hidden: { opacity: prefersReducedMotion ? 1 : 0 },
		visible: {
			opacity: 1,
			transition: prefersReducedMotion
				? { duration: 0 }
				: {
						staggerChildren: 0.15,
						delayChildren: 0,
					},
		},
	};

	const itemVariants = {
		hidden: {
			opacity: prefersReducedMotion ? 1 : 0,
			y: prefersReducedMotion ? 0 : 20,
		},
		visible: {
			opacity: 1,
			y: 0,
			transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.6 },
		},
	};

	return (
		<section
			className="py-24 bg-background relative overflow-hidden"
			aria-labelledby="community-heading"
		>
			<div className="container mx-auto px-4">
				<div className="text-center mb-20 space-y-4">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-caption font-medium uppercase tracking-wider">
						Build With Us
					</div>
					<h2
						id="community-heading"
						className="text-heading-1 font-bold text-foreground"
					>
						We're Building This in Public
					</h2>
					<p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
						No stealth mode. No surprise launches. Just honest development with
						community input.
					</p>
				</div>

				<m.div
					className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
					variants={containerVariants}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-100px" }}
					role="list"
				>
					{communityOptions.map((option, index) => (
						<m.div key={index} variants={itemVariants} role="listitem">
							<Link
								href={option.href}
								target="_blank"
								rel="noopener noreferrer"
								className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none rounded-xl block"
								aria-label={`${option.title}: ${option.description}`}
							>
								<div className="group p-8 rounded-xl border border-border bg-card hover:bg-card/80 hover:border-border/60 transition-all motion-reduce:transition-none h-full min-h-80 flex flex-col gap-4">
									<div
										className="text-muted-foreground group-hover:text-primary transition-colors motion-reduce:transition-none"
										aria-hidden="true"
									>
										{option.icon}
									</div>

									<h3 className="text-heading-3 font-bold text-foreground">
										{option.title}
									</h3>

									<p className="text-muted-foreground text-body-sm flex-grow">
										{option.description}
									</p>

									<div className="text-body-sm font-medium text-primary group-hover:text-primary/80 transition-colors motion-reduce:transition-none">
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
