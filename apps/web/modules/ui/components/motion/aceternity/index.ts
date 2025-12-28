/**
 * Aceternity UI Components
 *
 * Collection of modern UI components with smooth animations and effects.
 * All components respect `prefers-reduced-motion` for accessibility.
 */

// Grid & Layout - Re-export from canonical location
export type { BentoGridItemProps, BentoGridProps } from "@marketing/components/ui/bento-grid";
export { BentoGrid, BentoGridItem } from "@marketing/components/ui/bento-grid";
// 3D Effects
export { Card3D } from "./3d-card";
// Visual Effects
export { BackgroundBeams } from "./background-beams";
export { HeroHighlight } from "./hero-highlight";
export { ParallaxScroll } from "./parallax-scroll";

// Scroll Effects
export { VelocityScroll } from "./scroll-based-velocity";
export { Spotlight } from "./spotlight";
export { StickyScrollReveal } from "./sticky-scroll-reveal";
export { TracingBeam } from "./tracing-beam";
