"use client";

import { Button } from "@ui/components/button";
import { ArrowLeftIcon, MonitorIcon } from "lucide-react";
import { getIdeName, useIdeContext } from "../hooks/useIdeContext";

interface BackToIdeButtonProps {
	/** Custom class name */
	className?: string;
	/** Button variant */
	variant?: "primary" | "outline" | "ghost" | "secondary" | "error" | "light" | "link";
	/** Button size */
	size?: "sm" | "md" | "lg" | "icon";
	/** Show only when IDE is detected */
	hideIfNoIde?: boolean;
	/** Custom callback when clicked */
	onClick?: () => void;
}

/**
 * "Back to IDE" button that shows when user has VS Code (or other IDE) active
 * Per wireframes.md: "Back to VS Code" button sticky in top-right
 * Shows only when IDE context is detected via localStorage
 */
export function BackToIdeButton({
	className,
	variant = "outline",
	size = "md",
	hideIfNoIde = true,
	onClick,
}: BackToIdeButtonProps) {
	const { isDetected, ide } = useIdeContext();

	// Hide if no IDE detected and hideIfNoIde is true
	if (hideIfNoIde && !isDetected) {
		return null;
	}

	const ideName = getIdeName(ide);

	const handleClick = () => {
		if (onClick) {
			onClick();
			return;
		}

		// Try to focus the IDE window
		// For VS Code, we can use the vscode:// protocol
		// This works when VS Code is running and handles the protocol
		try {
			if (ide === "vscode" || ide === "code-insiders") {
				// VS Code protocol handler - focuses the window
				window.location.href = "vscode://snapback.snapback/focus";
			} else if (ide === "cursor") {
				// Cursor has similar protocol support
				window.location.href = "cursor://snapback.snapback/focus";
			} else if (ide === "windsurf") {
				// Windsurf protocol (may vary)
				window.location.href = "windsurf://snapback.snapback/focus";
			} else {
				// Generic fallback - just show a message
				// The user's IDE doesn't have a known protocol handler
				console.log("IDE focus requested but no protocol handler available for:", ide);
			}
		} catch (error) {
			console.error("Failed to focus IDE:", error);
		}
	};

	return (
		<Button
			variant={variant}
			size={size}
			className={className}
			onClick={handleClick}
			aria-label={`Back to ${ideName} editor`}
		>
			{ide ? (
				<>
					<ArrowLeftIcon className="mr-2 h-4 w-4" />
					Back to {ideName}
				</>
			) : (
				<>
					<MonitorIcon className="mr-2 h-4 w-4" />
					Back to IDE
				</>
			)}
		</Button>
	);
}

/**
 * IDE Status indicator for showing current connection
 */
export function IdeStatusIndicator({ className }: { className?: string }) {
	const { isDetected, ide, lastSeen } = useIdeContext();

	if (!isDetected) {
		return null;
	}

	const ideName = getIdeName(ide);
	const timeSince = lastSeen ? Math.floor((Date.now() - lastSeen) / 1000) : null;

	return (
		<div className={`flex items-center gap-2 text-sm text-muted-foreground ${className || ""}`}>
			<span className="flex h-2 w-2">
				<span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75" />
				<span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
			</span>
			<span>
				Connected: {ideName}
				{timeSince !== null && timeSince > 60 && (
					<span className="ml-1 text-xs text-muted-foreground/70">({Math.floor(timeSince / 60)}m ago)</span>
				)}
			</span>
		</div>
	);
}
