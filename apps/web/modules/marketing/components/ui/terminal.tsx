"use client";

import { cn } from "@ui/lib";
import { m } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface TerminalProps {
	lines: string[];
	className?: string;
	typingSpeed?: number;
	respectReducedMotion?: boolean;
}

export const Terminal = ({
	lines,
	className,
	typingSpeed = 30,
	respectReducedMotion = true,
}: TerminalProps) => {
	const terminalRef = useRef<HTMLDivElement>(null);
	const [displayedText, setDisplayedText] = useState<string>("");
	const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
	const [showCursor, setShowCursor] = useState<boolean>(true);
	const [isTyping, setIsTyping] = useState<boolean>(true);
	const [reducedMotion, setReducedMotion] = useState(false);
	// const _typingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // TODO: Re-enable when timeout ref is needed

	// Detect reduced motion preference
	useEffect(() => {
		if (!respectReducedMotion) {
			return;
		}

		const checkReducedMotion = () => {
			if (typeof window === "undefined") {
				return false;
			}
			try {
				return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			} catch {
				return false;
			}
		};

		setReducedMotion(checkReducedMotion());

		if (typeof window !== "undefined") {
			try {
				const mediaQuery = window.matchMedia(
					"(prefers-reduced-motion: reduce)",
				);
				const handleChange = (e: MediaQueryListEvent) =>
					setReducedMotion(e.matches);
				mediaQuery.addEventListener("change", handleChange);
				return () => mediaQuery.removeEventListener("change", handleChange);
			} catch {
				return () => {};
			}
		}

		return () => {};
	}, [respectReducedMotion]);

	// Enhanced typing animation effect
	useEffect(() => {
		if (!lines || lines.length === 0) {
			setIsTyping(false);
			return;
		}

		if (currentLineIndex >= lines.length) {
			setIsTyping(false);
			return;
		}

		const currentLine = lines[currentLineIndex];

		// If reduced motion, show line immediately
		if (reducedMotion) {
			const timeout = setTimeout(() => {
				if (currentLine !== undefined) {
					// Add null check
					setDisplayedText((prev) => `${prev}${currentLine}\n`);
				}
				setCurrentLineIndex((prev) => prev + 1);
			}, 50);

			return () => clearTimeout(timeout);
		}

		// Normal typing animation
		let charIndex = 0;
		const typeInterval = setInterval(() => {
			if (currentLine && charIndex < currentLine.length) {
				// Add null check for currentLine
				const nextChar = currentLine[charIndex];
				if (nextChar !== undefined) {
					setDisplayedText((prev) => prev + nextChar);
				}
				charIndex++;
			} else {
				clearInterval(typeInterval);
				setTimeout(() => {
					setDisplayedText((prev) => `${prev}\n`);
					setCurrentLineIndex((prev) => prev + 1);
				}, 300);
			}
		}, typingSpeed);

		return () => clearInterval(typeInterval);
	}, [currentLineIndex, lines, typingSpeed, reducedMotion]);

	// Cursor blink effect
	useEffect(() => {
		if (reducedMotion) {
			setShowCursor(true);
			return;
		}

		const cursorInterval = setInterval(() => {
			setShowCursor((prev) => !prev);
		}, 530);

		return () => clearInterval(cursorInterval);
	}, [reducedMotion]);

	// Scroll to bottom when new content is added
	useEffect(() => {
		if (terminalRef.current) {
			terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
		}
	}, [displayedText]);

	return (
		<m.div
			initial={{ opacity: 1, y: 0 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
			className={cn(
				"w-full rounded-lg shadow-2xl overflow-hidden font-mono",
				className,
			)}
			data-reduced-motion={reducedMotion}
			data-testid="terminal"
		>
			{/* Terminal Header */}
			<div
				className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700"
				data-testid="terminal-header"
			>
				<div className="flex gap-2">
					<div
						className="w-3 h-3 rounded-full bg-red-500"
						data-testid="terminal-dot"
					/>
					<div
						className="w-3 h-3 rounded-full bg-yellow-500"
						data-testid="terminal-dot"
					/>
					<div
						className="w-3 h-3 rounded-full bg-green-500"
						data-testid="terminal-dot"
					/>
				</div>
				<div className="flex-1 text-center">
					<span className="text-gray-400 text-xs sm:text-sm font-medium">
						Terminal
					</span>
				</div>
				{isTyping && (
					<div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
				)}
			</div>

			{/* Terminal Content */}
			<div
				ref={terminalRef}
				className="bg-black text-green-400 p-4 font-mono text-sm overflow-y-auto min-h-[300px] max-h-[500px]"
				data-testid="terminal-content"
			>
				<div className="whitespace-pre-wrap break-words">
					{displayedText}
					{isTyping && showCursor && (
						<span
							className="inline-block bg-green-400 text-black px-1 ml-1"
							aria-hidden="true"
							data-testid="terminal-cursor"
						>
							▎
						</span>
					)}
				</div>
			</div>
		</m.div>
	);
};
