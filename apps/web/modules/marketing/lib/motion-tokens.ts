// lib/motion-tokens.ts
export const motionTokens = {
	duration: {
		instant: 150,
		quick: 200,
		smooth: 400,
		slow: 800,
	},
	easing: {
		snap: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
		smooth: "cubic-bezier(0.23, 1, 0.32, 1)",
		ease: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	spring: {
		bouncy: { type: "spring" as const, stiffness: 300, damping: 15 },
		smooth: { type: "spring" as const, stiffness: 100, damping: 20 },
		slow: { type: "spring" as const, stiffness: 50, damping: 30 },
	},
} as const;

// CSS custom properties
export const cssMotionVars = `
  :root {
    --motion-instant: ${motionTokens.duration.instant}ms;
    --motion-quick: ${motionTokens.duration.quick}ms;
    --motion-smooth: ${motionTokens.duration.smooth}ms;
    --motion-slow: ${motionTokens.duration.slow}ms;
    --easing-snap: ${motionTokens.easing.snap};
    --easing-smooth: ${motionTokens.easing.smooth};
    --easing-ease: ${motionTokens.easing.ease};
  }
`;
