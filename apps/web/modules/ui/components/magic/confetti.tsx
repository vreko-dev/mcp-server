"use client";

import { useEffect, useRef } from "react";

interface ConfettiProps {
	particleCount?: number;
	duration?: number;
	colors?: string[];
}

export function Confetti({
	particleCount = 50,
	duration = 3000,
	colors = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"],
}: ConfettiProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return;
		}

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const particles: Array<{
			x: number;
			y: number;
			vx: number;
			vy: number;
			color: string;
			size: number;
			rotation: number;
			rotationSpeed: number;
		}> = [];

		// Create particles
		for (let i = 0; i < particleCount; i++) {
			particles.push({
				x: Math.random() * canvas.width,
				y: -10,
				vx: (Math.random() - 0.5) * 10,
				vy: Math.random() * 5 + 2,
				color: colors[Math.floor(Math.random() * colors.length)] ?? "#10B981",
				size: Math.random() * 8 + 4,
				rotation: Math.random() * 360,
				rotationSpeed: (Math.random() - 0.5) * 10,
			});
		}

		const startTime = Date.now();

		function animate() {
			if (!ctx || !canvas) {
				return;
			}

			const elapsed = Date.now() - startTime;
			if (elapsed > duration) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				return;
			}

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			particles.forEach((particle) => {
				particle.x += particle.vx;
				particle.y += particle.vy;
				particle.vy += 0.3; // Gravity
				particle.rotation += particle.rotationSpeed;

				ctx.save();
				ctx.translate(particle.x, particle.y);
				ctx.rotate((particle.rotation * Math.PI) / 180);
				ctx.fillStyle = particle.color;
				ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
				ctx.restore();
			});

			requestAnimationFrame(animate);
		}

		animate();
	}, [particleCount, duration, colors]);

	return (
		<canvas
			ref={canvasRef}
			className="fixed inset-0 pointer-events-none z-50"
			style={{ width: "100%", height: "100%" }}
		/>
	);
}
