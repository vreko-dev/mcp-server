"use client";

import { cn } from "@ui/lib";
import { Camera, Github, Play } from "lucide-react";

interface QueueTasksPreviewProps {
	className?: string;
}

export function QueueTasksPreview({ className }: QueueTasksPreviewProps) {
	const tasks = [
		{
			icon: <Github className="w-5 h-5" />,
			title: "Connect GitHub",
			description: "Star our repository",
			points: 50,
		},
		{
			icon: <Play className="w-5 h-5" />,
			title: "Watch Demo",
			description: "See SnapBack in action",
			points: 25,
		},
		{
			icon: <Camera className="w-5 h-5" />,
			title: "Make a Snapshot",
			description: "Try the extension",
			points: 100,
		},
	];

	const totalPoints = tasks.reduce((sum, task) => sum + task.points, 0);

	return (
		<div className={cn("rounded-lg border border-snapback-border bg-snapback-bg-secondary p-6", className)}>
			<div className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold text-snapback-text-primary mb-1">Priority Queue Tasks</h3>
					<p className="text-sm text-snapback-text-secondary">
						Complete these after signup to move up faster
					</p>
				</div>

				<div className="space-y-3">
					{tasks.map((task, index) => (
						<div
							key={index}
							className="group flex items-center gap-3 p-3 rounded-lg bg-snapback-bg-primary border border-snapback-border/50 hover:border-[#00FF41] hover:bg-[#00FF41]/5 transition-all cursor-pointer"
						>
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-snapback-bg-tertiary text-snapback-text-secondary group-hover:bg-[#00FF41]/10 group-hover:text-[#00FF41] transition-all">
								{task.icon}
							</div>
							<div className="flex-1">
								<p className="font-medium text-snapback-text-primary text-sm group-hover:text-white transition-colors">
									{task.title}
								</p>
								<p className="text-xs text-snapback-text-secondary">{task.description}</p>
							</div>
							<span className="text-sm font-semibold text-[#00FF41] group-hover:scale-110 transition-transform">
								+{task.points}
							</span>
						</div>
					))}
				</div>

				<div className="pt-2 border-t border-snapback-border/50">
					<p className="text-sm text-snapback-text-secondary text-center">
						<span className="font-semibold text-white">Total: {totalPoints} points</span> • Move up 175+
						positions
					</p>
				</div>
			</div>
		</div>
	);
}
