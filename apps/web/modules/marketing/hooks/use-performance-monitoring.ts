"use client";

import {
	getPerformanceMonitor,
	type MonitoringConfig,
	type PerformanceMetrics,
	type PerformanceReport,
	type PromiseViolation,
} from "@marketing/lib/performance-monitor";
import { useCallback, useEffect, useRef, useState } from "react";

interface UsePerformanceMonitoringOptions {
	enabled?: boolean;
	config?: Partial<MonitoringConfig>;
	onViolation?: (violation: PromiseViolation) => void;
	onReport?: (report: PerformanceReport) => void;
}

interface PerformanceMonitoringState {
	metrics: PerformanceMetrics | null;
	violations: PromiseViolation[];
	brandStatus: Record<string, "pass" | "fail">;
	overallScore: number;
	isMonitoring: boolean;
	lastUpdate: number;
}

export function usePerformanceMonitoring(options: UsePerformanceMonitoringOptions = {}) {
	const { enabled = true, config, onViolation, onReport } = options;

	const [state, setState] = useState<PerformanceMonitoringState>({
		metrics: null,
		violations: [],
		brandStatus: {},
		overallScore: 100,
		isMonitoring: false,
		lastUpdate: 0,
	});

	const violationCountRef = useRef(0);
	const onViolationRef = useRef(onViolation);
	const onReportRef = useRef(onReport);

	// Update refs to avoid stale closures
	useEffect(() => {
		onViolationRef.current = onViolation;
		onReportRef.current = onReport;
	}, [onViolation, onReport]);

	const updateState = useCallback((monitor: any) => {
		const metrics = monitor.getMetrics();
		const violations = monitor.getViolations();
		const brandStatus = monitor.getBrandPromiseStatus();
		const report = monitor.generateReport();

		// Check for new violations
		const newViolationCount = violations.length;
		if (newViolationCount > violationCountRef.current && onViolationRef.current) {
			const newViolations = violations.slice(violationCountRef.current);
			newViolations.forEach((violation: PromiseViolation) => onViolationRef.current?.(violation));
		}
		violationCountRef.current = newViolationCount;

		// Trigger report callback
		if (onReportRef.current) {
			onReportRef.current(report);
		}

		setState({
			metrics,
			violations,
			brandStatus,
			overallScore: report.overallScore,
			isMonitoring: true,
			lastUpdate: Date.now(),
		});
	}, []);

	useEffect(() => {
		if (!enabled || typeof window === "undefined") {
			setState((prev) => ({ ...prev, isMonitoring: false }));
			return;
		}

		const monitor = getPerformanceMonitor(config);

		const unsubscribe = monitor.subscribe(() => {
			updateState(monitor);
		});

		// Initial state update
		updateState(monitor);

		return () => {
			unsubscribe();
			setState((prev) => ({ ...prev, isMonitoring: false }));
		};
	}, [enabled, config, updateState]);

	// Helper functions
	const getBrandPromiseViolations = useCallback(() => {
		return state.violations.filter((v) =>
			["checkpointLatency", "recoveryTime", "cpuUsage", "memoryUsage", "frameRate", "dataLossEvents"].includes(
				v.metric,
			),
		);
	}, [state.violations]);

	const getCriticalViolations = useCallback(() => {
		return state.violations.filter((v) => v.severity === "critical");
	}, [state.violations]);

	const getRecentViolations = useCallback(
		(timeWindowMs = 60000) => {
			const cutoff = Date.now() - timeWindowMs;
			return state.violations.filter((v) => v.timestamp > cutoff);
		},
		[state.violations],
	);

	const isPromiseMet = useCallback(
		(promise: keyof typeof state.brandStatus) => {
			return state.brandStatus[promise] === "pass";
		},
		[state.brandStatus],
	);

	const getAllPromisesMet = useCallback(() => {
		return Object.values(state.brandStatus).every((status) => status === "pass");
	}, [state.brandStatus]);

	const getMetricValue = useCallback(
		(metric: keyof PerformanceMetrics) => {
			return state.metrics?.[metric] ?? 0;
		},
		[state.metrics],
	);

	const getMetricStatus = useCallback(
		(metric: keyof PerformanceMetrics): "excellent" | "good" | "warning" => {
			if (!state.metrics) {
				return "warning";
			}

			const value = state.metrics[metric];
			const thresholds = {
				checkpointLatency: { excellent: 50, good: 100 },
				recoveryTime: { excellent: 1000, good: 2000 },
				cpuUsage: { excellent: 0.5, good: 1 },
				memoryUsage: { excellent: 25, good: 50 },
				frameRate: { excellent: 60, good: 50 },
				dataLossEvents: { excellent: 0, good: 0 },
			};

			const threshold = thresholds[metric as keyof typeof thresholds];
			if (!threshold) {
				return "good";
			}

			if (metric === "frameRate") {
				if (value >= threshold.excellent) {
					return "excellent";
				}
				if (value >= threshold.good) {
					return "good";
				}
				return "warning";
			}
			if (value <= threshold.excellent) {
				return "excellent";
			}
			if (value <= threshold.good) {
				return "good";
			}
			return "warning";
		},
		[state.metrics],
	);

	return {
		// State
		...state,

		// Computed values
		brandPromiseViolations: getBrandPromiseViolations(),
		criticalViolations: getCriticalViolations(),
		recentViolations: getRecentViolations(),
		allPromisesMet: getAllPromisesMet(),

		// Helper functions
		isPromiseMet,
		getRecentViolations,
		getMetricValue,
		getMetricStatus,
		getBrandPromiseViolations,
		getCriticalViolations,
		getAllPromisesMet,
	};
}

// Specialized hook for brand promise monitoring
export function useBrandPromiseMonitoring() {
	const monitoring = usePerformanceMonitoring({
		enabled: true,
		config: {
			enableRealTimeTracking: true,
			enableAlerts: process.env.NODE_ENV === "development",
			sampleRate: 1.0,
			reportingInterval: 1000,
		},
	});

	const brandPromises = [
		{
			key: "checkpoint_latency" as const,
			label: "Checkpoint Creation",
			target: 100,
			unit: "ms",
			promise: "<100ms checkpoints",
			critical: true,
		},
		{
			key: "recovery_time" as const,
			label: "Recovery Time",
			target: 2000,
			unit: "ms",
			promise: "<2s recovery",
			critical: true,
		},
		{
			key: "cpu_usage" as const,
			label: "CPU Usage",
			target: 1,
			unit: "%",
			promise: "<1% CPU idle",
			critical: false,
		},
		{
			key: "memory_usage" as const,
			label: "Memory Usage",
			target: 50,
			unit: "MB",
			promise: "<50MB memory",
			critical: false,
		},
		{
			key: "frame_rate" as const,
			label: "Frame Rate",
			target: 60,
			unit: "fps",
			promise: "60fps animations",
			critical: false,
		},
		{
			key: "data_loss" as const,
			label: "Data Loss",
			target: 0,
			unit: "events",
			promise: "Zero data loss",
			critical: true,
		},
	];

	const getPromiseDetails = useCallback((key: string) => {
		return brandPromises.find((p) => p.key === key);
	}, []);

	const getCriticalPromiseViolations = useCallback(() => {
		return monitoring.brandPromiseViolations.filter((v) => {
			const promise = getPromiseDetails(v.metric);
			return promise?.critical === true;
		});
	}, [monitoring.brandPromiseViolations, getPromiseDetails]);

	const getPromiseScore = useCallback(
		(key: string) => {
			const promise = getPromiseDetails(key);
			if (!promise || !monitoring.metrics) {
				return 0;
			}

			const metricKey = key.replace("_", "") as keyof PerformanceMetrics;
			const value = monitoring.metrics[metricKey];

			if (metricKey === "frameRate") {
				return Math.min(100, (value / promise.target) * 100);
			}
			return Math.max(0, 100 - (value / promise.target) * 100);
		},
		[monitoring.metrics, getPromiseDetails],
	);

	return {
		...monitoring,
		brandPromises,
		criticalPromiseViolations: getCriticalPromiseViolations(),
		getPromiseDetails,
		getPromiseScore,
	};
}

// Hook for development monitoring alerts
export function usePerformanceAlerts() {
	const [alerts, setAlerts] = useState<
		Array<{
			id: string;
			type: "violation" | "recovery" | "degradation";
			message: string;
			severity: "low" | "medium" | "high" | "critical";
			timestamp: number;
		}>
	>([]);

	usePerformanceMonitoring({
		enabled: process.env.NODE_ENV === "development",
		onViolation: useCallback((violation: PromiseViolation) => {
			const alert = {
				id: `${violation.metric}-${violation.timestamp}`,
				type: "violation" as const,
				message: `${violation.context}: ${violation.actual.toFixed(1)} (target: ${violation.target})`,
				severity: violation.severity,
				timestamp: violation.timestamp,
			};

			setAlerts((prev) => [...prev.slice(-9), alert]); // Keep last 10 alerts
		}, []),
	});

	const clearAlerts = useCallback(() => {
		setAlerts([]);
	}, []);

	const dismissAlert = useCallback((id: string) => {
		setAlerts((prev) => prev.filter((alert) => alert.id !== id));
	}, []);

	return {
		alerts,
		clearAlerts,
		dismissAlert,
		hasAlerts: alerts.length > 0,
		criticalAlerts: alerts.filter((a) => a.severity === "critical"),
	};
}

export default usePerformanceMonitoring;
