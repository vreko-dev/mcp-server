"use client";

import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { Camera, CheckCircle2, ExternalLink, Github, Play, Twitter } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import ConfettiExplosion from "react-confetti-explosion";
import { snapbackColors } from "@/lib/design-system";
import { useAnalytics } from "@/modules/analytics/provider/posthog";

type QueueTask = {
	id: "github" | "demo" | "snapshot";
	title: string;
	description: string;
	points: number;
	icon: React.ReactNode;
	completed: boolean;
	action?: () => void;
};

interface WaitlistSuccessProps {
	queuePosition: number;
	email: string;
}

export function WaitlistSuccess({ queuePosition, email }: WaitlistSuccessProps) {
	const { trackEvent } = useAnalytics();
	const [showConfetti, setShowConfetti] = useState(true);
	const [tasks, setTasks] = useState<QueueTask[]>([
		{
			id: "github",
			title: "Star on GitHub",
			description: "Show us some love on GitHub",
			points: 50,
			icon: <Github className="w-5 h-5" />,
			completed: false,
			action: () => {
				window.open("https://github.com/snapback/snapback", "_blank");
			},
		},
		{
			id: "demo",
			title: "Watch 60s Demo",
			description: "See SnapBack in action",
			points: 25,
			icon: <Play className="w-5 h-5" />,
			completed: false,
			action: () => {
				window.open("https://snapback.dev/demo", "_blank");
			},
		},
		{
			id: "snapshot",
			title: "Make a Snapshot",
			description: "Try the extension early",
			points: 100,
			icon: <Camera className="w-5 h-5" />,
			completed: false,
			action: () => {
				window.open("https://snapback.dev/docs/quickstart", "_blank");
			},
		},
	]);

	// Load completed tasks from API
	useEffect(() => {
		async function fetchCompletedTasks() {
			try {
				const response = await fetch(`/api/waitlist/task?email=${encodeURIComponent(email)}`);
				if (response.ok) {
					const data = await response.json();
					if (data.success && data.tasks) {
						setTasks((prevTasks) =>
							prevTasks.map((task) => ({
								...task,
								completed: data.tasks.some((t: { type: string }) => t.type === task.id),
							})),
						);
					}
				}
			} catch (error) {
				console.error("Failed to fetch completed tasks:", error);
			}
		}

		fetchCompletedTasks();
	}, [email]);

	const handleTaskComplete = async (taskId: string) => {
		// Optimistic update
		setTasks((prevTasks) => prevTasks.map((task) => (task.id === taskId ? { ...task, completed: true } : task)));

		try {
			const response = await fetch("/api/waitlist/task", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, taskId }),
			});

			const data = await response.json();

			if (data.success) {
				// Track event
				trackEvent("queue_jump_task_completed", {
					taskId,
					email,
					pointsEarned: data.task.pointsEarned,
					totalPoints: data.totalPoints,
				});
			} else if (data.error === "Task already completed") {
				// Already completed, no action needed
				console.log("Task already completed");
			} else {
				// Revert optimistic update on error
				setTasks((prevTasks) =>
					prevTasks.map((task) => (task.id === taskId ? { ...task, completed: false } : task)),
				);
				console.error("Failed to complete task:", data.error);
			}
		} catch (error) {
			// Revert optimistic update on error
			setTasks((prevTasks) =>
				prevTasks.map((task) => (task.id === taskId ? { ...task, completed: false } : task)),
			);
			console.error("Error completing task:", error);
		}
	};

	const completedPoints = tasks.filter((t) => t.completed).reduce((sum, t) => sum + t.points, 0);
	const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0);

	const shareOnTwitter = () => {
		const text = `Just joined the @SnapBackDev private alpha waitlist! 🎉 I'm #${queuePosition} in line. Beta launches Q1 2026. Join me:`;
		const url = "https://snapback.dev/waitlist";
		window.open(
			`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
			"_blank",
		);

		trackEvent("waitlist_shared", {
			platform: "twitter",
			queuePosition,
		});
	};

	return (
		<div className="max-w-2xl mx-auto">
			{/* Confetti Celebration */}
			{showConfetti && (
				<div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
					<ConfettiExplosion
						duration={3000}
						force={0.6}
						particleCount={150}
						width={1600}
						onComplete={() => setShowConfetti(false)}
					/>
				</div>
			)}

			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
				className="space-y-8 rounded-lg border border-snapback-green/30 bg-snapback-bg-secondary p-8"
			>
				{/* Success Header */}
				<div className="text-center">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
						className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
						style={{ backgroundColor: snapbackColors.green.glow }}
					>
						<CheckCircle2 className="w-10 h-10" style={{ color: snapbackColors.green.DEFAULT }} />
					</motion.div>
					<h2 className="text-3xl font-bold text-snapback-text-primary mb-2">🎉 You're on the list!</h2>
					<p className="text-snapback-text-secondary">
						Welcome to the SnapBack Private Alpha • Beta launching Q1 2026
					</p>
				</div>

				{/* Queue Position - Large and Prominent */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="text-center py-8 bg-snapback-bg-primary rounded-lg border-2 border-snapback-green/30"
				>
					<p className="text-sm text-snapback-text-secondary mb-2 uppercase tracking-wide">Queue Position</p>
					<p className="text-6xl font-bold bg-gradient-to-r from-[#00FF41] via-[#34D399] to-[#00FF41] bg-clip-text text-transparent">
						#{queuePosition}
					</p>
					<p className="text-sm text-snapback-text-secondary mt-2">Check your email for next steps</p>
				</motion.div>

				{/* Timeline */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="space-y-4"
				>
					<h3 className="text-xl font-semibold text-snapback-text-primary">What Happens Next</h3>

					<div className="space-y-4">
						{/* Timeline Item 1 */}
						<div className="flex gap-4">
							<div className="flex flex-col items-center">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-snapback-green/20 border border-snapback-green">
									<CheckCircle2 className="h-4 w-4 text-snapback-green" />
								</div>
								<div className="flex-1 w-0.5 bg-snapback-border my-2" />
							</div>
							<div className="flex-1 pb-4">
								<p className="text-sm font-semibold text-snapback-text-primary mb-1">📧 Now</p>
								<p className="text-sm text-snapback-text-secondary">
									You're confirmed for private alpha! Complete tasks to jump ahead in the queue.
								</p>
							</div>
						</div>

						{/* Timeline Item 2 */}
						<div className="flex gap-4">
							<div className="flex flex-col items-center">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-snapback-bg-tertiary border border-snapback-border">
									<span className="text-xs">2</span>
								</div>
								<div className="flex-1 w-0.5 bg-snapback-border my-2" />
							</div>
							<div className="flex-1 pb-4">
								<p className="text-sm font-semibold text-snapback-text-primary mb-1">
									⏰ Within 48-72 hours
								</p>
								<p className="text-sm text-snapback-text-secondary">
									We'll send you installation instructions and your alpha access key as spots open up.
								</p>
							</div>
						</div>

						{/* Timeline Item 3 */}
						<div className="flex gap-4">
							<div className="flex flex-col items-center">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-snapback-bg-tertiary border border-snapback-border">
									<span className="text-xs">3</span>
								</div>
							</div>
							<div className="flex-1">
								<p className="text-sm font-semibold text-snapback-text-primary mb-1">
									🚀 Q1 2026 - Beta Launch
								</p>
								<p className="text-sm text-snapback-text-secondary">
									Get 6 months of SnapBack Pro free when we launch beta. No credit card needed.
								</p>
							</div>
						</div>
					</div>
				</motion.div>

				{/* Queue Jump Tasks */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5 }}
					className="space-y-4"
				>
					<div className="flex items-center justify-between">
						<h3 className="text-xl font-semibold text-snapback-text-primary">⚡ Jump the Queue</h3>
						<span className="text-sm text-snapback-text-secondary">
							{completedPoints}/{totalPoints} points
						</span>
					</div>

					{/* Progress Bar */}
					<div className="h-2 bg-snapback-bg-tertiary rounded-full overflow-hidden">
						<motion.div
							className="h-full rounded-full"
							style={{ backgroundColor: snapbackColors.green.DEFAULT }}
							initial={{ width: 0 }}
							animate={{
								width: `${(completedPoints / totalPoints) * 100}%`,
							}}
							transition={{ duration: 0.5, ease: "easeOut" }}
						/>
					</div>

					{/* Tasks */}
					<div className="space-y-3">
						{tasks.map((task) => (
							<div
								key={task.id}
								className={cn(
									"flex items-center justify-between rounded-lg border p-4 transition-all",
									task.completed
										? "border-snapback-green/30 bg-snapback-green/5"
										: "border-snapback-border bg-snapback-bg-primary hover:border-snapback-green/20",
								)}
							>
								<div className="flex items-center gap-3">
									<div
										className={cn(
											"flex h-10 w-10 items-center justify-center rounded-full",
											task.completed
												? "bg-snapback-green/20 text-snapback-green"
												: "bg-snapback-bg-tertiary text-snapback-text-secondary",
										)}
									>
										{task.icon}
									</div>
									<div>
										<p className="font-medium text-snapback-text-primary">{task.title}</p>
										<p className="text-sm text-snapback-text-secondary">{task.description}</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm font-semibold text-snapback-green">+{task.points}</span>
									{!task.completed && (
										<Button
											size="sm"
											variant="outline"
											onClick={() => {
												if (task.action) {
													task.action();
												}
												handleTaskComplete(task.id);
											}}
											className="hover:border-snapback-green hover:bg-snapback-green/10"
										>
											Start
										</Button>
									)}
									{task.completed && (
										<CheckCircle2
											className="w-5 h-5"
											style={{ color: snapbackColors.green.DEFAULT }}
										/>
									)}
								</div>
							</div>
						))}
					</div>
				</motion.div>

				{/* Action Buttons */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
					className="flex flex-col sm:flex-row gap-3 pt-4"
				>
					<Button onClick={shareOnTwitter} className="flex-1 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white">
						<Twitter className="w-4 h-4 mr-2" />
						Share on Twitter
					</Button>
					<Button
						variant="outline"
						className="flex-1"
						onClick={() => window.open("https://snapback.dev/dashboard", "_blank")}
					>
						<ExternalLink className="w-4 h-4 mr-2" />
						View Dashboard
					</Button>
				</motion.div>
			</motion.div>
		</div>
	);
}
