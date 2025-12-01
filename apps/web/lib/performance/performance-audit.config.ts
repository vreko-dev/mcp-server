/**
 * Performance Audit Configuration
 * Comprehensive metrics and thresholds for SnapBack marketing app
 */

export interface PerformanceTarget {
	target: number;
	budget: number;
	critical?: number;
}

export interface DeviceTargets {
	mobile: Record<string, PerformanceTarget>;
	desktop: Record<string, PerformanceTarget>;
}

export const performanceConfig = {
	metrics: {
		mobile: {
			// Core Web Vitals
			FCP: { target: 1800, budget: 2400 }, // First Contentful Paint
			LCP: { target: 2500, budget: 4000 }, // Largest Contentful Paint
			FID: { target: 100, budget: 300 }, // First Input Delay
			CLS: { target: 0.1, budget: 0.25 }, // Cumulative Layout Shift
			TTI: { target: 3800, budget: 7300 }, // Time to Interactive
			TBT: { target: 200, budget: 600 }, // Total Blocking Time
			INP: { target: 200, budget: 500 }, // Interaction to Next Paint

			// Custom metrics
			fps: { target: 55, budget: 45, critical: 30 },
			memory: { target: 150, budget: 250, critical: 350 }, // MB
			bundleSize: { target: 500, budget: 1000, critical: 1500 }, // KB
			animationFrameDrops: { target: 5, budget: 15, critical: 30 }, // %
		},
		desktop: {
			FCP: { target: 1000, budget: 1500 },
			LCP: { target: 1500, budget: 2500 },
			FID: { target: 50, budget: 100 },
			CLS: { target: 0.05, budget: 0.1 },
			TTI: { target: 2000, budget: 3500 },
			TBT: { target: 150, budget: 350 },
			INP: { target: 100, budget: 200 },

			fps: { target: 60, budget: 55, critical: 45 },
			memory: { target: 100, budget: 200, critical: 300 },
			bundleSize: { target: 400, budget: 800, critical: 1200 },
			animationFrameDrops: { target: 2, budget: 8, critical: 20 },
		},
	},

	browsers: ["chrome", "safari", "firefox", "edge"] as const,

	devices: [
		"iPhone 12",
		"iPhone 13",
		"iPhone 14",
		"Samsung Galaxy S21",
		"Samsung Galaxy S22",
		"iPad Pro",
		"iPad Air",
		"Pixel 5",
		"Pixel 6",
	] as const,

	throttling: {
		cpuSlowdown: 4,
		network: "Fast 3G",
		requestLatency: 150,
		downloadThroughput: 1.6 * 1000 * 1000, // 1.6Mbps
		uploadThroughput: 750 * 1000, // 750Kbps
	},

	// Animation performance thresholds
	animation: {
		maxFrameTime: 16.67, // 60fps = 16.67ms per frame
		jankThreshold: 32, // 2 frames
		smoothnessTarget: 0.95, // 95% smooth frames
		memoryLeakThreshold: 50, // MB increase per minute
	},

	// Safari-specific optimizations
	safari: {
		forceGPUAcceleration: true,
		useTransform3d: true,
		avoidComplexAnimations: true,
		maxConcurrentAnimations: 3,
	},

	// Bundle analysis thresholds
	bundles: {
		maxInitialJS: 500 * 1024, // 500KB
		maxInitialCSS: 100 * 1024, // 100KB
		maxChunkSize: 250 * 1024, // 250KB
		maxAsyncChunks: 10,
		treeshakingEfficiency: 0.8, // 80% unused code removed
	},

	// Memory monitoring
	memory: {
		samplingInterval: 10000, // 10 seconds
		warningThreshold: 150, // MB
		criticalThreshold: 250, // MB
		leakDetectionWindow: 300000, // 5 minutes
	},
} as const;

export type PerformanceMetric = keyof typeof performanceConfig.metrics.mobile;
export type Browser = (typeof performanceConfig.browsers)[number];
export type Device = (typeof performanceConfig.devices)[number];
