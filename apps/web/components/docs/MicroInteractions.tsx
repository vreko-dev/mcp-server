"use client";

import { useEffect, useId, useState } from "react";

export function CopyButton({ code }: { code: string }) {
	const [copied, setCopied] = useState(false);

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);

			// Announce to screen readers
			const announcement = document.createElement("div");
			announcement.setAttribute("role", "status");
			announcement.setAttribute("aria-live", "polite");
			announcement.className = "sr-only";
			announcement.textContent = "Code copied to clipboard";
			document.body.appendChild(announcement);

			setTimeout(() => {
				setCopied(false);
				document.body.removeChild(announcement);
			}, 2000);
		} catch (err) {
			console.error("Failed to copy text: ", err);
		}
	};

	return (
		<button
			type="button"
			onClick={copyToClipboard}
			aria-label={copied ? "Code copied" : "Copy code to clipboard"}
			className={`copy-button px-3 py-1 text-xs rounded transition-all ${
				copied
					? "bg-emerald-500 text-white"
					: "bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 border border-emerald-700/50"
			}`}
		>
			{copied ? "✓ Copied" : "Copy"}
		</button>
	);
}

export function ExpandableSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	const [expanded, setExpanded] = useState(false);
	const contentId = useId();

	return (
		<div className="expandable my-2">
			<button
				type="button"
				className="expandable-trigger w-full cursor-pointer flex items-center justify-between p-3 bg-emerald-900/10 rounded-lg hover:bg-emerald-900/20 transition-colors"
				onClick={() => setExpanded(!expanded)}
				aria-expanded={expanded}
				aria-controls={contentId}
			>
				<span>{title}</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={`transition-transform ${expanded ? "rotate-180" : ""}`}
					aria-hidden="true"
				>
					<polyline points="6 9 12 15 18 9" />
				</svg>
			</button>
			<div
				id={contentId}
				className="expandable-content overflow-hidden transition-all duration-300 ease-in-out"
				style={{ maxHeight: expanded ? "1000px" : "0px" }}
				aria-hidden={!expanded}
			>
				<div className="p-3">{children}</div>
			</div>
		</div>
	);
}

export function ProgressBar() {
	const [scrollProgress, setScrollProgress] = useState(0);

	useEffect(() => {
		const handleScroll = () => {
			const totalScroll = document.documentElement.scrollTop;
			const windowHeight =
				document.documentElement.scrollHeight -
				document.documentElement.clientHeight;
			const progress = (totalScroll / windowHeight) * 100;
			setScrollProgress(progress);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<div className="progress-bar">
			<div
				className="progress-bar-fill"
				style={{ width: `${scrollProgress}%` }}
			/>
		</div>
	);
}

export function StatusBadge({
	status,
}: {
	status: "online" | "offline" | "warning";
}) {
	const statusConfig = {
		online: {
			text: "System Online",
			color: "text-emerald-400",
			bg: "bg-emerald-900/20",
		},
		offline: {
			text: "System Offline",
			color: "text-red-400",
			bg: "bg-red-900/20",
		},
		warning: {
			text: "Degraded",
			color: "text-yellow-400",
			bg: "bg-yellow-900/20",
		},
	};

	const config = statusConfig[status];

	return (
		<div
			className={`status-badge ${config.bg} ${config.color} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2`}
		>
			{status === "online" && (
				<span className="relative flex h-2 w-2">
					<span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
					<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
				</span>
			)}
			{status === "warning" && (
				<span className="relative flex h-2 w-2">
					<span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
					<span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
				</span>
			)}
			{status === "offline" && (
				<span className="relative flex h-2 w-2">
					<span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
				</span>
			)}
			<span>{config.text}</span>
		</div>
	);
}
