"use client";
import { m } from "motion/react";
import { useEffect, useState } from "react";

export function IntegrationsSection() {
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const integrations = [
		{
			name: "VS Code",
			description: "Full extension with real-time protection",
			status: "Available",
			link: "#vscode",
			icon: <IconVSCode />,
		},
		{
			name: "JetBrains IDEs",
			description: "IntelliJ, WebStorm, PyCharm support",
			status: "Available",
			link: "#jetbrains",
			icon: <IconJetBrains />,
		},
		{
			name: "Neovim",
			description: "Terminal-based protection for vim users",
			status: "Available",
			link: "#neovim",
			icon: <IconNeovim />,
		},
		{
			name: "Terminal/CLI",
			description: "Command-line interface for any editor",
			status: "Available",
			link: "#cli",
			icon: <IconTerminal />,
		},
		{
			name: "Web IDEs",
			description: "GitHub Codespaces, Replit, StackBlitz",
			status: "Coming Soon",
			link: "#web",
			icon: <IconWeb />,
		},
		{
			name: "Xcode",
			description: "iOS and macOS development protection",
			status: "Coming Soon",
			link: "#xcode",
			icon: <IconXcode />,
		},
	];

	return (
		<div className="container mx-auto">
			<div className="text-center mb-16">
				<h2 className="text-display font-black text-white mb-6">Works where you work</h2>
				<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
					SnapBack integrates seamlessly with your favorite development environment
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
				{integrations.map((integration, index) => (
					<IntegrationCard key={index} integration={integration} index={index} isMounted={isMounted} />
				))}
			</div>
		</div>
	);
}

const IntegrationCard = ({
	integration,
	index,
	isMounted,
}: {
	integration: any;
	index: number;
	isMounted: boolean;
}) => {
	const isAvailable = integration.status === "Available";

	return (
		<m.div
			className="card-glass group cursor-pointer"
			initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1 }}
			whileHover={{ y: -5 }}
		>
			<div className="flex items-start space-x-4">
				<div
					className={`p-3 rounded-lg ${
						isAvailable ? "bg-primary/20" : "bg-muted/20"
					} group-hover:scale-110 transition-transform`}
				>
					{integration.icon}
				</div>
				<div className="flex-1">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-lg font-semibold text-white">{integration.name}</h3>
						<span
							className={`text-xs px-2 py-1 rounded-full ${
								isAvailable ? "bg-primary/20 text-primary" : "bg-muted/20 text-muted-foreground"
							}`}
						>
							{integration.status}
						</span>
					</div>
					<p className="text-muted-foreground text-sm mb-4">{integration.description}</p>
					<div className="flex items-center space-x-2">
						<m.button
							className={`text-sm font-medium ${
								isAvailable ? "text-primary hover:text-primary/80" : "text-muted-foreground"
							}`}
							whileHover={isAvailable ? { x: 5 } : {}}
							disabled={!isAvailable}
						>
							{isAvailable ? "Connect" : "Notify me"}
						</m.button>
						<m.svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							className={isAvailable ? "text-primary" : "text-muted-foreground"}
							animate={isAvailable ? { x: [0, 3, 0] } : {}}
							transition={{
								repeat: Number.POSITIVE_INFINITY,
								duration: 2,
							}}
						>
							<path
								d="M6 3L10 8L6 13"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</m.svg>
					</div>
				</div>
			</div>
		</m.div>
	);
};

// Icon components
const IconVSCode = () => (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
		<path
			d="M18.5 1.5l-13 12 3.5 3.5 13-12-3.5-3.5z"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

const IconJetBrains = () => (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
		<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
		<path d="M7 7h10M7 12h7M7 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
	</svg>
);

const IconNeovim = () => (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
		<path d="M3 3l18 18M3 21l18-18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
	</svg>
);

const IconTerminal = () => (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
		<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
		<path
			d="M7 9l3 3-3 3M13 15h4"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

const IconWeb = () => (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
		<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
		<path
			d="M3.6 9h16.8M3.6 15h16.8M12 3c-1.5 4-1.5 8 0 12 1.5-4 1.5-8 0-12z"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</svg>
);

const IconXcode = () => (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
		<path
			d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);
