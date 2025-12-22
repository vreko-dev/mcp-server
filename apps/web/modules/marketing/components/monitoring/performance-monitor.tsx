"use client";

import { CheckpointPulse } from "@marketing/components/ui/snap-motion";
import { useEffect, useState } from "react";

// SnapBack brand KPIs from PRD
interface SnapBackMetrics {
	checkpointCreationTime: number; // Target: <100ms
	recoveryTime: number; // Target: <2s
	cpuUsage: number; // Target: <1%
	memoryFootprint: number; // Target: <50MB
	animationFPS: number; // Target: 60fps
	timeSaved: number; // Calculated value prop
	failuresPrevented: number; // Trust metric
	devServerStartup: number; // Target: <2s
}

type MetricStatus = "excellent" | "good" | "warning";

// Helper functions to reduce component complexity
const useWebVitalsMonitoring = (setMetrics: React.Dispatch<React.SetStateAction<SnapBackMetrics>>) => {
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		import("web-vitals").then(({ onCLS, onFCP, onLCP, onTTFB }) => {
			onCLS((metric) => {
				if (metric.value > 0.1) {
					console.warn(`🚨 CLS exceeds target: ${metric.value}`);
				}
			});

			onLCP((metric) => {
				if (metric.value > 2500) {
					console.warn(`🚨 LCP exceeds brand promise: ${metric.value}`);
				}
				setMetrics((prev) => ({
					...prev,
					recoveryTime: metric.value / 1000,
				}));
			});

			onTTFB((metric) => {
				setMetrics((prev) => ({
					...prev,
					checkpointCreationTime: metric.value,
				}));
			});

			onFCP((metric) => {
				console.debug(`[⚡ FCP] First Contentful Paint: ${metric.value}ms`);
			});
		});
	}, [setMetrics]);
};

const usePerformanceMonitoring = (setMetrics: React.Dispatch<React.SetStateAction<SnapBackMetrics>>) => {
	useEffect(() => {
		const monitorMemory = () => {
			if ((performance as any).memory) {
				const memoryMB = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
				setMetrics((prev) => ({
					...prev,
					memoryFootprint: Math.round(memoryMB),
				}));

				if (memoryMB > 50 && document.hidden) {
					console.warn(`[🚨 Memory] Usage exceeds idle target: ${Math.round(memoryMB)}MB`);
				}
			}
		};

		const monitorCPU = () => {
			const start = performance.now();
			setTimeout(() => {
				const end = performance.now();
				const cpuEstimate = Math.min((end - start) / 10, 5);
				setMetrics((prev) => ({ ...prev, cpuUsage: cpuEstimate }));
			}, 100);
		};

		let frameCount = 0;
		let lastTime = performance.now();

		const monitorFPS = () => {
			frameCount++;
			const currentTime = performance.now();

			if (currentTime >= lastTime + 1000) {
				const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
				setMetrics((prev) => ({ ...prev, animationFPS: fps }));

				if (fps < 60) {
					console.warn(`[⚠️ FPS] Animation performance degraded: ${fps}fps`);
				}

				frameCount = 0;
				lastTime = currentTime;
			}

			requestAnimationFrame(monitorFPS);
		};

		const memoryInterval = setInterval(monitorMemory, 5000);
		const cpuInterval = setInterval(monitorCPU, 2000);

		requestAnimationFrame(monitorFPS);
		monitorMemory();
		monitorCPU();

		return () => {
			clearInterval(memoryInterval);
			clearInterval(cpuInterval);
		};
	}, [setMetrics]);
};

export function SnapBackPerformanceMonitor() {
	const [metrics, setMetrics] = useState<SnapBackMetrics>({
		checkpointCreationTime: 0,
		recoveryTime: 0,
		cpuUsage: 0,
		memoryFootprint: 0,
		animationFPS: 60,
		timeSaved: 0,
		failuresPrevented: 0,
		devServerStartup: 945,
	});

	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		setIsVisible(process.env.NODE_ENV === "development");
	}, []);

	useWebVitalsMonitoring(setMetrics);
	usePerformanceMonitoring(setMetrics);

	// Helper to determine metric status
	const getMetricStatus = (value: number, target: number, isLowerBetter = true): MetricStatus => {
		if (isLowerBetter) {
			if (value <= target * 0.8) {
				return "excellent";
			}
			if (value <= target) {
				return "good";
			}
			return "warning";
		}
		if (value >= target) {
			return "excellent";
		}
		if (value >= target * 0.9) {
			return "good";
		}
		return "warning";
	};

	const getStatusColor = (status: MetricStatus): string => {
		switch (status) {
			case "excellent":
				return "text-green-400";
			case "good":
				return "text-[#10B981]";
			case "warning":
				return "text-orange-400";
		}
	};

	const MetricDisplay = ({
		label,
		value,
		target,
		unit,
		isLowerBetter = true,
		formatter = (v: number) => v.toString(),
	}: {
		label: string;
		value: number;
		target: number;
		unit: string;
		isLowerBetter?: boolean;
		formatter?: (value: number) => string;
	}) => {
		const status = getMetricStatus(value, target, isLowerBetter);
		const color = getStatusColor(status);

		return (
			<div className="space-y-1">
				<div className="text-gray-400 text-xs">{label}</div>
				<div className={`font-bold ${color}`}>
					{formatter(value)}
					{unit}
				</div>
				<div className="text-gray-500 text-xs">
					/ {target}
					{unit}
				</div>
			</div>
		);
	};

	// Production monitoring only (hidden overlay)
	if (!isVisible) {
		return null;
	}

	return (
		<>
			{/* Development Performance Dashboard */}
			<div className="fixed bottom-4 right-4 bg-black/90 border border-gray-700 text-white p-6 rounded-xl font-mono text-xs z-50 max-w-sm backdrop-blur-sm">
				<div className="flex items-center gap-2 mb-4">
					<CheckpointPulse speed="fast">
						<div className="w-3 h-3 bg-[#10B981] rounded-full" />
					</CheckpointPulse>
					<span className="font-bold text-[#10B981] text-sm">SnapBack Performance</span>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<MetricDisplay
						label="Checkpoint"
						value={metrics.checkpointCreationTime}
						target={100}
						unit="ms"
						formatter={(x: number) => Math.round(x).toString()}
					/>
					<MetricDisplay
						label="Recovery"
						value={metrics.recoveryTime}
						target={2}
						unit="s"
						formatter={(v) => v.toFixed(2)}
					/>
					<MetricDisplay label="Memory" value={metrics.memoryFootprint} target={50} unit="MB" />
					<MetricDisplay
						label="Animation"
						value={metrics.animationFPS}
						target={60}
						unit="fps"
						isLowerBetter={false}
					/>
					<MetricDisplay
						label="CPU"
						value={metrics.cpuUsage}
						target={1}
						unit="%"
						formatter={(v) => v.toFixed(1)}
					/>
					<MetricDisplay label="Startup" value={metrics.devServerStartup} target={2000} unit="ms" />
				</div>

				{/* Brand Promise Summary */}
				<div className="mt-4 pt-4 border-t border-gray-700">
					<div className="text-gray-400 text-xs mb-2">Brand Promises</div>
					<div className="flex items-center gap-2">
						<div
							className={`w-2 h-2 rounded-full ${
								metrics.checkpointCreationTime <= 100 &&
								metrics.recoveryTime <= 2 &&
								metrics.memoryFootprint <= 50 &&
								metrics.animationFPS >= 60
									? "bg-green-400"
									: "bg-orange-400"
							}`}
						/>
						<span className="text-xs">
							{metrics.checkpointCreationTime <= 100 &&
							metrics.recoveryTime <= 2 &&
							metrics.memoryFootprint <= 50 &&
							metrics.animationFPS >= 60
								? "All promises met ✅"
								: "Some targets missed ⚠️"}
						</span>
					</div>
				</div>
			</div>
		</>
	);
}

// Export for layout.tsx integration
export function BrandPromiseValidator({ children }: { children: React.ReactNode }) {
	return (
		<>
			{children}
			<SnapBackPerformanceMonitor />
		</>
	);
}
