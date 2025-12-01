// Create hover utilities
export const hoverEffects = {
	lift: "transition-transform hover:-translate-y-1 hover:shadow-lg",
	glow: "transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]",
	pulse: "hover:animate-pulse",
	scale: "transition-transform hover:scale-105",

	// Magnetic button effect
	magnetic: (strength = 0.3) => ({
		onMouseMove: (e: React.MouseEvent<HTMLElement>) => {
			const rect = e.currentTarget.getBoundingClientRect();
			const x = e.clientX - rect.left - rect.width / 2;
			const y = e.clientY - rect.top - rect.height / 2;
			e.currentTarget.style.transform = `translate(${x * strength}px, ${
				y * strength
			}px)`;
		},
		onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
			e.currentTarget.style.transform = "";
		},
	}),
};
