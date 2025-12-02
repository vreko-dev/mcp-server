/**
 * @snapback/motion - Motion utilities and accessibility hooks
 *
 * Provides WCAG 2.1 AA compliant motion utilities for React applications
 * with support for reduced motion preferences
 */

// Constants
export { DURATION, EASING } from "./constants";
// Animation presets
export { fadeInUp, scaleIn, slideInLeft, slideInRight } from "./presets";
// Hooks
export { useReducedMotion } from "./useReducedMotion";
