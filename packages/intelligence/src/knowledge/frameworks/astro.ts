/**
 * Astro Framework Configuration
 *
 * Pattern expectations and risk zones for Astro applications.
 *
 * @module knowledge/frameworks/astro
 */

import type { FrameworkConfig } from "../types.js";

export const astroConfig: FrameworkConfig = {
	id: "astro",
	name: "Astro",
	category: "static",

	indicators: [
		{ type: "dependency", pattern: "astro", weight: 0.95 },
		{ type: "file", pattern: "astro.config.{js,ts,mjs}", weight: 0.95 },
		{ type: "file", pattern: "src/pages/**/*.astro", weight: 0.9 },
		{ type: "file", pattern: "src/layouts/*.astro", weight: 0.85 },
	],

	expectedPatterns: [
		// Error Handling
		{
			id: "astro-error-page",
			name: "Error Page",
			description: "Custom 404 and 500 error pages",
			category: "error-handling",
			importance: "recommended",
			detection: {
				method: "file-exists",
				pattern: "src/pages/404.astro",
			},
			docs: "https://docs.astro.build/en/core-concepts/astro-pages/#custom-404-error-page",
		},
		{
			id: "astro-error-boundary",
			name: "Island Error Boundaries",
			description: "Error handling for interactive islands",
			category: "error-handling",
			importance: "recommended",
			detection: {
				method: "content-match",
				pattern: "client:only|client:load|client:visible",
				files: ["src/**/*.astro"],
			},
		},

		// Data Fetching
		{
			id: "astro-content-collections",
			name: "Content Collections",
			description: "Type-safe content with collections",
			category: "data-fetching",
			importance: "recommended",
			detection: {
				method: "file-exists",
				pattern: "src/content/config.ts",
			},
		},
		{
			id: "astro-data-fetching",
			name: "Data Fetching",
			description: "Server-side data fetching in frontmatter",
			category: "data-fetching",
			importance: "optional",
			detection: {
				method: "content-match",
				pattern: "await fetch|Astro\\.glob",
				files: ["src/**/*.astro"],
			},
		},

		// Routing
		{
			id: "astro-dynamic-routes",
			name: "Dynamic Routes",
			description: "Dynamic routing with getStaticPaths",
			category: "routing",
			importance: "optional",
			detection: {
				method: "content-match",
				pattern: "getStaticPaths",
				files: ["src/pages/**/*.astro"],
			},
		},

		// Performance
		{
			id: "astro-image-optimization",
			name: "Image Optimization",
			description: "Using astro:assets for optimized images",
			category: "performance",
			importance: "recommended",
			detection: {
				method: "content-match",
				pattern: "astro:assets|<Image",
				files: ["src/**/*.astro"],
			},
		},
		{
			id: "astro-view-transitions",
			name: "View Transitions",
			description: "SPA-like navigation with View Transitions",
			category: "performance",
			importance: "optional",
			detection: {
				method: "content-match",
				pattern: "ViewTransitions|view-transitions",
				files: ["src/**/*.astro"],
			},
		},

		// Security
		{
			id: "astro-csp",
			name: "Content Security Policy",
			description: "CSP headers configuration",
			category: "security",
			importance: "recommended",
			detection: {
				method: "content-match",
				pattern: "Content-Security-Policy",
				files: ["astro.config.*", "src/middleware.*"],
			},
		},

		// Testing
		{
			id: "astro-testing",
			name: "Testing Setup",
			description: "Playwright or other testing framework",
			category: "testing",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "@playwright/test|vitest",
			},
		},

		// Configuration
		{
			id: "astro-integrations",
			name: "Integrations",
			description: "Astro integrations for extended functionality",
			category: "configuration",
			importance: "optional",
			detection: {
				method: "content-match",
				pattern: "integrations:",
				files: ["astro.config.*"],
			},
		},

		// State Management (for islands)
		{
			id: "astro-islands-state",
			name: "Island State Management",
			description: "State sharing between islands",
			category: "state-management",
			importance: "optional",
			detection: {
				method: "dependency",
				pattern: "nanostores|@nanostores",
			},
		},
	],

	riskZones: [
		{
			id: "api-endpoints",
			name: "API Endpoints",
			reason: "Server-side logic in SSR mode",
			patterns: ["src/pages/api/**"],
			severity: "high",
			requiredDocumentation: ["Endpoint contracts", "Authentication", "Error handling"],
		},
		{
			id: "middleware",
			name: "Middleware",
			reason: "Request processing, auth, redirects",
			patterns: ["src/middleware.*"],
			severity: "high",
			requiredDocumentation: ["Middleware logic", "Auth flow", "Redirects"],
		},
		{
			id: "content-config",
			name: "Content Configuration",
			reason: "Schema definitions for content",
			patterns: ["src/content/config.ts"],
			severity: "medium",
			requiredDocumentation: ["Collection schemas", "Validation rules"],
		},
		{
			id: "islands",
			name: "Interactive Islands",
			reason: "Client-side JavaScript components",
			patterns: ["src/components/**/*.{tsx,jsx,vue,svelte}"],
			severity: "medium",
			requiredDocumentation: ["Hydration strategy", "State management"],
		},
	],

	contextFiles: [
		{
			path: ".llm-context/ARCHITECTURE.md",
			purpose: "Site architecture and content structure",
			required: true,
			expectedSections: ["Overview", "Directory Structure", "Content Collections", "Islands Architecture"],
		},
		{
			path: ".llm-context/PATTERNS.md",
			purpose: "Astro patterns and conventions",
			required: true,
			expectedSections: ["Component Patterns", "Data Fetching", "Island Hydration"],
		},
		{
			path: ".llm-context/CONSTRAINTS.md",
			purpose: "Technical constraints",
			required: true,
			expectedSections: ["Performance Budgets", "Browser Support", "Build Configuration"],
		},
	],

	recommendedStructure: {
		root: ".llm-context",
		directories: ["patterns"],
		files: [
			{
				path: ".llm-context/ARCHITECTURE.md",
				purpose: "Astro architecture",
				required: true,
				template: `# Architecture

## Overview
[Brief description of the site]

## Directory Structure
\`\`\`
src/
├── pages/           # File-based routing
├── layouts/         # Page layouts
├── components/      # Astro + framework components
├── content/         # Content collections
├── styles/          # Global styles
└── assets/          # Static assets
\`\`\`

## Content Collections
[Describe content structure]

## Islands Architecture
[Describe interactive components and hydration strategy]
`,
			},
			{
				path: ".llm-context/PATTERNS.md",
				purpose: "Astro patterns",
				required: true,
				template: `# Patterns

## Component Patterns
- .astro for static components
- Framework components for interactivity
- Slots for composition

## Data Fetching
- Content collections for typed content
- fetch() in frontmatter for external data
- getStaticPaths for dynamic routes

## Island Hydration
- client:load for immediate interactivity
- client:visible for lazy loading
- client:only for client-only components
`,
			},
		],
	},
};
