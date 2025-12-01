"use client";

import { Button } from "@ui/components/button";
import { hoverEffects } from "../../lib/hoverEffects";

export function HoverEffectExample() {
	return (
		<div className="flex flex-col gap-4 p-8">
			<h2 className="text-2xl font-bold">Hover Effect Examples</h2>

			{/* Lift effect */}
			<Button className={hoverEffects.lift}>Lift Effect</Button>

			{/* Glow effect */}
			<Button className={hoverEffects.glow}>Glow Effect</Button>

			{/* Scale effect */}
			<Button className={hoverEffects.scale}>Scale Effect</Button>

			{/* Magnetic effect */}
			<Button className="transition-transform" {...hoverEffects.magnetic(0.2)}>
				Magnetic Effect
			</Button>
		</div>
	);
}
