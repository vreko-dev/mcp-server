"use client";

import {
	getPerformanceMonitor,
	type PerformanceMetrics,
	type PerformanceReport,
} from "@marketing/lib/performance-monitor";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

interface PerformanceContextValue {
	metrics: PerformanceMetrics | null;
	report: PerformanceReport | null;
	isMonitoring: boolean;
	startMonitoring: () => void;
	stopMonitoring: () => void;
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

interface PerformanceProviderProps {
	children: React.ReactNode;
	autoStart?: boolean;
	enableAnalytics?: boolean;
	reportingInterval?: number;
}

export function PerformanceProvider({
	children,
	autoStart = true,
	enableAnalytics = true,
	reportingInterval = 30000, // 30 seconds
}: PerformanceProviderProps) {
	const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
	const [report, setReport] = useState<PerformanceReport | null>(null);
	const [isMonitoring, setIsMonitoring] = useState(false);

	useEffect(() => {
		if (!autoStart || typeof window === "undefined") {
			return;
		}

		startMonitoring();

		return () => {
			stopMonitoring();
		};
	}, [autoStart]);

	const startMonitoring = () => {
		if (typeof window === "undefined" || isMonitoring) {
			return;
		}

		const monitor = getPerformanceMonitor({
			enableRealTimeTracking: true,
			enableAlerts: process.env.NODE_ENV === "development",
			sampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
			reportingInterval: 1000,
		});

		const unsubscribe = monitor.subscribe((newMetrics) => {
			setMetrics(newMetrics);
			const newReport = monitor.generateReport();
			setReport(newReport);
		});

		// Send performance data to analytics endpoint
		if (enableAnalytics) {
			const analyticsInterval = setInterval(async () => {
				const currentReport = monitor.generateReport();

				try {
					await fetch("/api/performance/metrics", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							type: "performance_metrics",
							metrics: currentReport.metrics,
							brandPromiseStatus: currentReport.brandPromiseStatus,
							overallScore: currentReport.overallScore,
							timestamp: Date.now(),
							sessionId: getSessionId(),
						}),
					});
				} catch (error) {
					// Silently fail - don't disrupt user experience
					if (process.env.NODE_ENV === "development") {
						console.warn("Failed to send performance metrics", { error });
					}
				}
			}, reportingInterval);

			// Store cleanup function
			(unsubscribe as any).analyticsCleanup = () =>
				clearInterval(analyticsInterval);
		}

		setIsMonitoring(true);

		// Store unsubscribe function for cleanup
		(window as any).__performanceUnsubscribe = unsubscribe;
	};

	const stopMonitoring = () => {
		if (typeof window === "undefined" || !isMonitoring) {
			return;
		}

		const unsubscribe = (window as any).__performanceUnsubscribe;
		if (unsubscribe) {
			unsubscribe();
			if ((unsubscribe as any).analyticsCleanup) {
				(unsubscribe as any).analyticsCleanup();
			}
			(window as any).__performanceUnsubscribe = undefined;
		}

		setIsMonitoring(false);
		setMetrics(null);
		setReport(null);
	};

	const value: PerformanceContextValue = {
		metrics,
		report,
		isMonitoring,
		startMonitoring,
		stopMonitoring,
	};

	return (
		<PerformanceContext.Provider value={value}>
			{children}
		</PerformanceContext.Provider>
	);
}

export function usePerformanceContext() {
	const context = useContext(PerformanceContext);
	if (!context) {
		throw new Error(
			"usePerformanceContext must be used within a PerformanceProvider",
		);
	}
	return context;
}

// Generate or retrieve session ID for analytics
function getSessionId(): string {
	if (typeof window === "undefined") {
		return "ssr";
	}

	let sessionId = sessionStorage.getItem("snapback-session-id");
	if (!sessionId) {
		sessionId = `session-${Date.now()}-${Math.random()
			.toString(36)
			.substring(2)}`;
		sessionStorage.setItem("snapback-session-id", sessionId);
	}
	return sessionId;
}

export default PerformanceProvider;
