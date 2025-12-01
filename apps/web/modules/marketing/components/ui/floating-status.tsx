"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";

interface FloatingStatusProps {
	delay?: number;
	className?: string;
	onClose?: () => void;
	autoHide?: boolean;
	hideAfter?: number;
}

export function FloatingStatus({
	delay = 3000,
	className = "",
	onClose,
	autoHide = true,
	hideAfter = 15000,
}: FloatingStatusProps) {
	const [isVisible, setIsVisible] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [pulsePhase, setPulsePhase] = useState(0);
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		// Show after delay
		const showTimer = setTimeout(() => {
			setIsVisible(true);
		}, delay);

		// Auto-hide after specified time
		let hideTimer: NodeJS.Timeout;
		if (autoHide) {
			hideTimer = setTimeout(() => {
				setIsVisible(false);
				onClose?.();
			}, delay + hideAfter);
		}

		return () => {
			clearTimeout(showTimer);
			if (hideTimer) {
				clearTimeout(hideTimer);
			}
		};
	}, [delay, autoHide, hideAfter, onClose]);

	// Pulse phase cycling for urgency
	useEffect(() => {
		if (!isVisible) {
			return;
		}

		const interval = setInterval(() => {
			setPulsePhase((prev) => (prev + 1) % 3);
		}, 2000);

		return () => clearInterval(interval);
	}, [isVisible]);

	const handleClose = () => {
		setIsVisible(false);
		onClose?.();
	};

	return (
		<AnimatePresence>
			{isVisible && (
				<m.div
					className={`fixed bottom-6 right-6 z-50 ${className}`}
					initial={
						isMounted
							? {
									opacity: 0,
									scale: 0,
									x: 20,
									y: 20,
								}
							: {
									opacity: 1,
									scale: 1,
									x: 0,
									y: 0,
								}
					}
					animate={{
						opacity: 1,
						scale: 1,
						x: 0,
						y: 0,
					}}
					exit={{
						opacity: 0,
						scale: 0.8,
						x: 20,
						y: 20,
					}}
					transition={{
						type: "spring",
						stiffness: 400,
						damping: 25,
					}}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
				>
					<m.div
						className="relative bg-black/90 border border-red-500/50 rounded-xl p-4 backdrop-blur-md shadow-2xl max-w-sm"
						animate={{
							borderColor: isHovered
								? "rgba(239, 68, 68, 0.8)"
								: pulsePhase === 0
									? "rgba(239, 68, 68, 0.3)"
									: pulsePhase === 1
										? "rgba(239, 68, 68, 0.6)"
										: "rgba(220, 38, 38, 0.9)",
							boxShadow: isHovered
								? "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(239, 68, 68, 0.3)"
								: pulsePhase === 2
									? "0 10px 30px rgba(0, 0, 0, 0.4), 0 0 25px rgba(220, 38, 38, 0.4)"
									: "0 10px 30px rgba(0, 0, 0, 0.4), 0 0 15px rgba(239, 68, 68, 0.2)",
						}}
						transition={{
							duration: 0.3,
							ease: "easeInOut",
						}}
					>
						{/* Pulsing danger indicator */}
						<m.div
							className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"
							animate={{
								scale: pulsePhase === 2 ? [1, 1.5, 1] : [1, 1.2, 1],
								opacity: [0.7, 1, 0.7],
							}}
							transition={{
								duration: 1.5,
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
							}}
						/>

						{/* Warning icon */}
						<div className="flex items-start gap-3">
							<m.div
								className="flex-shrink-0 mt-1"
								animate={{
									rotate: pulsePhase === 1 ? [0, 5, -5, 0] : 0,
								}}
								transition={{
									duration: 0.5,
									ease: "easeInOut",
								}}
							>
								<svg
									className="w-6 h-6 text-red-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Warning</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
									/>
								</svg>
							</m.div>

							<div className="flex-1 min-w-0">
								<m.h3
									className="text-red-400 font-semibold text-sm mb-1"
									animate={{
										textShadow:
											pulsePhase === 2
												? "0 0 8px rgba(239, 68, 68, 0.6)"
												: "0 0 4px rgba(239, 68, 68, 0.3)",
									}}
								>
									SECURITY ALERT
								</m.h3>

								<p className="text-red-300 text-xs leading-relaxed mb-3">
									Your code is currently{" "}
									<span className="font-semibold text-red-200">
										unprotected
									</span>
									. Vulnerabilities detected in real-time.
								</p>

								<m.div
									className="text-center"
									animate={{
										y: isHovered ? 0 : [0, -2, 0],
									}}
									transition={{
										duration: 2,
										repeat: isHovered ? 0 : Number.POSITIVE_INFINITY,
										ease: "easeInOut",
									}}
								>
									<button
										type="button"
										className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors duration-200 shadow-lg"
										onClick={() => {
											// Scroll to pricing or main CTA
											const pricingSection = document.getElementById("pricing");
											if (pricingSection) {
												pricingSection.scrollIntoView({
													behavior: "smooth",
												});
											}
											handleClose();
										}}
									>
										Activate Protection
									</button>
								</m.div>
							</div>

							{/* Close button */}
							<button
								type="button"
								onClick={handleClose}
								className="flex-shrink-0 text-red-400/60 hover:text-red-400 transition-colors duration-200 p-1"
								aria-label="Close alert"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Close</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						{/* Animated border effect */}
						<m.div
							className="absolute inset-0 rounded-xl border border-red-500/20 pointer-events-none"
							animate={{
								opacity: pulsePhase === 0 ? [0.2, 0.6, 0.2] : [0.1, 0.3, 0.1],
							}}
							transition={{
								duration: 2,
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
							}}
						/>

						{/* Urgency sweep effect */}
						<m.div
							className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
							animate={{
								background:
									pulsePhase === 1
										? [
												"linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.1) 50%, transparent 100%)",
												"linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.2) 50%, transparent 100%)",
												"linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.1) 50%, transparent 100%)",
											]
										: "transparent",
							}}
							transition={{
								duration: 1.5,
								ease: "easeInOut",
							}}
						/>
					</m.div>
				</m.div>
			)}
		</AnimatePresence>
	);
}
