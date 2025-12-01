"use client";
import { BentoGrid, BentoGridItem } from "@marketing/components/ui/bento-grid";
import { BarChart, Code, Layout, Shield, User, Zap } from "lucide-react";
import { m } from "motion/react";
import { useEffect, useState } from "react";

const FeatureGrid = () => {
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const features = [
		{
			title: "Workflow Compiler",
			description:
				"Transform manual processes into automated workflows with intelligent pattern recognition and code generation.",
			header: (
				<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 p-4 border border-primary/20">
					<m.div
						className="flex items-center justify-center w-full"
						initial={
							isMounted ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }
						}
						whileInView={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.6 }}
					>
						<div className="relative">
							<m.div
								className="text-4xl font-mono text-primary"
								animate={{ rotate: [0, 360] }}
								transition={{
									duration: 20,
									repeat: Number.POSITIVE_INFINITY,
									ease: "linear",
								}}
							>
								⚙️
							</m.div>
							<m.div
								className="absolute -top-2 -right-2 bg-accent text-background text-xs px-2 py-1 rounded-full font-mono"
								initial={isMounted ? { scale: 0 } : { scale: 1 }}
								animate={{ scale: 1 }}
								transition={{ delay: 0.5 }}
							>
								RUN
							</m.div>
						</div>
					</m.div>
				</div>
			),
			icon: <Code className="h-4 w-4 text-primary" />,
		},
		{
			title: "Human-in-the-Loop",
			description:
				"Maintain control with smart approval workflows. Critical decisions stay with your team while routine tasks get automated.",
			header: (
				<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 p-4 border border-secondary/20">
					<m.div
						className="flex items-center justify-center w-full space-x-4"
						initial={isMounted ? { opacity: 0 } : { opacity: 1 }}
						whileInView={{ opacity: 1 }}
						transition={{ duration: 0.6 }}
					>
						<m.button
							className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded text-sm font-mono"
							whileHover={{
								scale: 1.05,
								backgroundColor: "hsl(140 100% 50% / 0.3)",
								borderColor: "hsl(140 100% 50% / 0.5)",
								boxShadow: "0 0 10px hsl(140 100% 50% / 0.4)",
							}}
						>
							Approve
						</m.button>
						<m.button
							className="bg-destructive/20 text-destructive border border-destructive/30 px-3 py-1 rounded text-sm font-mono"
							whileHover={{
								scale: 1.05,
								backgroundColor: "hsl(0 84% 60% / 0.3)",
								borderColor: "hsl(0 84% 60% / 0.5)",
								boxShadow: "0 0 10px hsl(0 84% 60% / 0.4)",
							}}
						>
							Reject
						</m.button>
					</m.div>
				</div>
			),
			icon: <User className="h-4 w-4 text-secondary" />,
		},
		{
			title: "Observability",
			description:
				"Real-time monitoring and analytics give you complete visibility into your automation performance and team productivity gains.",
			header: (
				<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 p-4 border border-accent/20">
					<m.div
						className="flex items-center justify-center w-full"
						initial={isMounted ? { opacity: 0 } : { opacity: 1 }}
						whileInView={{ opacity: 1 }}
						transition={{ duration: 0.6 }}
					>
						<div className="w-full h-12 flex items-end space-x-1">
							{[...Array(8)].map((_, i) => (
								<m.div
									key={i}
									className="bg-gradient-to-t from-accent/60 to-accent flex-1 rounded-t border border-accent/20"
									initial={
										isMounted
											? { height: 0, opacity: 0 }
											: { height: "auto", opacity: 1 }
									}
									animate={{
										height: Math.random() * 40 + 20,
										opacity: 1,
									}}
									transition={{
										duration: 2,
										repeat: Number.POSITIVE_INFINITY,
										delay: i * 0.1,
										repeatType: "reverse",
									}}
									whileHover={{
										boxShadow: "0 0 10px hsl(15 100% 60% / 0.6)",
									}}
								/>
							))}
						</div>
					</m.div>
				</div>
			),
			icon: <BarChart className="h-4 w-4 text-accent" />,
			className: "md:col-span-2",
		},
		{
			title: "Templates",
			description:
				"Pre-built automation templates for common DevOps patterns. Copy, customize, and deploy in minutes.",
			header: (
				<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 p-4 border border-primary/20">
					<m.div
						className="flex items-center justify-center w-full"
						initial={isMounted ? { opacity: 0 } : { opacity: 1 }}
						whileInView={{ opacity: 1 }}
						transition={{ duration: 0.6 }}
					>
						<div className="grid grid-cols-2 gap-2 w-full">
							{[
								{ name: "CI/CD", color: "primary" },
								{ name: "Deploy", color: "secondary" },
								{ name: "Test", color: "accent" },
								{ name: "Monitor", color: "primary" },
							].map((template, i) => (
								<m.div
									key={i}
									className="bg-primary/10 border border-primary/20 rounded p-2 text-xs text-center font-mono"
									whileHover={{
										scale: 1.05,
										boxShadow: "0 0 8px hsl(140 100% 50% / 0.4)",
										borderColor: "hsl(140 100% 50% / 0.5)",
									}}
									initial={
										isMounted ? { y: 10, opacity: 0 } : { y: 0, opacity: 1 }
									}
									animate={{ y: 0, opacity: 1 }}
									transition={{ delay: i * 0.1 }}
								>
									{template.name}
								</m.div>
							))}
						</div>
					</m.div>
				</div>
			),
			icon: <Layout className="h-4 w-4 text-primary" />,
		},
		{
			title: "Connectors",
			description:
				"Seamlessly integrate with your existing tools. GitHub, Slack, Azure DevOps, n8n, and 50+ more integrations.",
			header: (
				<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 p-4 border border-secondary/20">
					<m.div
						className="flex items-center justify-center w-full"
						initial={isMounted ? { opacity: 0 } : { opacity: 1 }}
						whileInView={{ opacity: 1 }}
						transition={{ duration: 0.6 }}
					>
						<div className="flex space-x-3">
							{[
								{ name: "GH", color: "primary" },
								{ name: "SL", color: "secondary" },
								{ name: "AZ", color: "accent" },
								{ name: "N8", color: "primary" },
							].map((connector, i) => (
								<m.div
									key={i}
									className="w-8 h-8 bg-secondary/10 border border-secondary/20 rounded flex items-center justify-center text-xs font-bold font-mono"
									whileHover={{
										scale: 1.15,
										boxShadow: "0 0 12px hsl(191 100% 50% / 0.5)",
										borderColor: "hsl(191 100% 50% / 0.6)",
									}}
									animate={{ y: [0, -5, 0] }}
									transition={{
										duration: 3,
										delay: i * 0.3,
										repeat: Number.POSITIVE_INFINITY,
									}}
								>
									{connector.name}
								</m.div>
							))}
						</div>
					</m.div>
				</div>
			),
			icon: <Zap className="h-4 w-4 text-secondary" />,
		},
		{
			title: "Security",
			description:
				"Enterprise-grade security with SOC2 compliance, encrypted data transmission, and granular access controls.",
			header: (
				<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 p-4 border border-primary/20">
					<m.div
						className="flex items-center justify-center w-full"
						initial={isMounted ? { opacity: 0 } : { opacity: 1 }}
						whileInView={{ opacity: 1 }}
						transition={{ duration: 0.6 }}
					>
						<div className="flex flex-col items-center gap-2">
							<m.div
								className="text-3xl"
								animate={{
									scale: [1, 1.1, 1],
									filter: [
										"drop-shadow(0 0 0px hsl(140 100% 50%))",
										"drop-shadow(0 0 8px hsl(140 100% 50% / 0.8))",
										"drop-shadow(0 0 0px hsl(140 100% 50%))",
									],
								}}
								transition={{
									duration: 2,
									repeat: Number.POSITIVE_INFINITY,
								}}
							>
								🛡️
							</m.div>
							<m.div
								className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-mono border border-primary/30"
								initial={
									isMounted ? { opacity: 0, y: 5 } : { opacity: 1, y: 0 }
								}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
							>
								SOC2
							</m.div>
						</div>
					</m.div>
				</div>
			),
			icon: <Shield className="h-4 w-4 text-primary" />,
		},
	];

	return (
		<section id="features" className="py-20">
			<div className="container">
				<m.div
					className="text-center mb-16"
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
				>
					<h2 className="text-display mb-6">
						Built for <span className="text-primary">developers</span>,<br />
						loved by <span className="text-secondary">teams</span>
					</h2>
					<p className="text-xl text-muted-foreground max-w-3xl mx-auto">
						Everything you need to automate, monitor, and scale your development
						workflows.
					</p>
				</m.div>

				<m.div
					initial={isMounted ? { opacity: 0, y: 40 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.2 }}
					viewport={{ once: true }}
				>
					<BentoGrid className="max-w-4xl mx-auto">
						{features.map((item, i) => (
							<BentoGridItem
								key={i}
								title={item.title}
								description={item.description}
								header={item.header}
								icon={item.icon}
								{...(item.className && {
									className: item.className,
								})}
							/>
						))}
					</BentoGrid>
				</m.div>
			</div>
		</section>
	);
};

export default FeatureGrid;
