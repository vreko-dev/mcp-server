/**
 * React + Vite Framework Configuration
 *
 * Pattern expectations and risk zones for React applications using Vite.
 *
 * @module knowledge/frameworks/react-vite
 */

import type { FrameworkConfig } from "../types.js";

export const reactViteConfig: FrameworkConfig = {
	id: "react-vite",
	name: "React (Vite)",
	category: "frontend",

	indicators: [
		{ type: "dependency", pattern: "vite", weight: 0.5 },
		{ type: "dependency", pattern: "react", weight: 0.5 },
		{ type: "dependency", pattern: "@vitejs/plugin-react", weight: 0.9 },
		{ type: "file", pattern: "vite.config.{js,ts,mjs}", weight: 0.85 },
		{ type: "file", pattern: "index.html", weight: 0.3 },
	],

	expectedPatterns: [
		// Error Handling
		{
			id: "react-error-boundary",
			name: "Error Boundary",
			description: "React Error Boundary for graceful error handling",
			category: "error-handling",
			importance: "critical",
			detection: {
				method: "ast",
				pattern: "componentDidCatch|ErrorBoundary|react-error-boundary",
				files: ["src/**/*.{tsx,jsx}"],
			},
			docs: "https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary",
		},
		{
			id: "react-suspense",
			name: "Suspense Boundaries",
			description: "Suspense for async component loading",
			category: "error-handling",
			importance: "recommended",
			detection: {
				method: "content-match",
				pattern: "<Suspense",
				files: ["src/**/*.{tsx,jsx}"],
			},
		},

		// State Management
		{
			id: "react-state-management",
			name: "State Management",
			description: "Consistent state management approach",
			category: "state-management",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "zustand|jotai|recoil|redux|@tanstack/react-query",
			},
		},
		{
			id: "react-query",
			name: "Server State Management",
			description: "TanStack Query for server state",
			category: "data-fetching",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "@tanstack/react-query",
			},
		},

		// Routing
		{
			id: "react-router",
			name: "Client Routing",
			description: "React Router for navigation",
			category: "routing",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "react-router-dom|@tanstack/react-router",
			},
		},

		// Validation
		{
			id: "react-form-validation",
			name: "Form Validation",
			description: "Form handling with validation",
			category: "validation",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "react-hook-form|formik",
			},
		},

		// Testing
		{
			id: "react-testing-library",
			name: "Testing Library",
			description: "React Testing Library setup",
			category: "testing",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "@testing-library/react",
			},
		},
		{
			id: "react-vitest",
			name: "Vitest Configuration",
			description: "Vitest for unit testing",
			category: "testing",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "vitest",
			},
		},

		// Performance
		{
			id: "react-lazy-loading",
			name: "Lazy Loading",
			description: "Code splitting with React.lazy",
			category: "performance",
			importance: "recommended",
			detection: {
				method: "content-match",
				pattern: "React\\.lazy|lazy\\(",
				files: ["src/**/*.{tsx,jsx}"],
			},
		},
		{
			id: "react-memo",
			name: "Memoization",
			description: "Performance optimization with memo/useMemo/useCallback",
			category: "performance",
			importance: "optional",
			detection: {
				method: "content-match",
				pattern: "React\\.memo|useMemo|useCallback",
				files: ["src/**/*.{tsx,jsx}"],
			},
		},

		// Security
		{
			id: "react-xss-prevention",
			name: "XSS Prevention",
			description: "Avoiding dangerouslySetInnerHTML or sanitizing",
			category: "security",
			importance: "critical",
			detection: {
				method: "content-match",
				pattern: "dangerouslySetInnerHTML",
				files: ["src/**/*.{tsx,jsx}"],
			},
		},

		// Configuration
		{
			id: "vite-env-types",
			name: "Environment Types",
			description: "Typed environment variables",
			category: "configuration",
			importance: "recommended",
			detection: {
				method: "file-exists",
				pattern: "src/vite-env.d.ts",
			},
		},
	],

	riskZones: [
		{
			id: "api-calls",
			name: "API Integration",
			reason: "Data fetching, error handling, auth headers",
			patterns: ["src/api/**", "src/services/**", "src/lib/api*"],
			severity: "high",
			requiredDocumentation: ["API client setup", "Error handling strategy", "Authentication flow"],
		},
		{
			id: "auth-context",
			name: "Authentication Context",
			reason: "User state, tokens, permissions",
			patterns: ["src/context/auth*", "src/providers/auth*", "src/hooks/useAuth*"],
			severity: "critical",
			requiredDocumentation: ["Auth flow", "Token storage", "Protected routes"],
		},
		{
			id: "global-state",
			name: "Global State",
			reason: "Shared application state",
			patterns: ["src/store/**", "src/state/**", "src/atoms/**"],
			severity: "high",
			requiredDocumentation: ["State structure", "Update patterns", "Persistence"],
		},
		{
			id: "env-config",
			name: "Environment Configuration",
			reason: "API URLs, feature flags",
			patterns: [".env*", "vite.config.*"],
			severity: "medium",
			requiredDocumentation: ["Required variables", "Build-time vs runtime"],
		},
	],

	contextFiles: [
		{
			path: ".llm-context/ARCHITECTURE.md",
			purpose: "Component architecture and data flow",
			required: true,
			expectedSections: ["Overview", "Directory Structure", "Component Hierarchy", "Data Flow"],
		},
		{
			path: ".llm-context/PATTERNS.md",
			purpose: "React patterns and conventions",
			required: true,
			expectedSections: ["Component Patterns", "Hook Patterns", "State Management", "Error Handling"],
		},
		{
			path: ".llm-context/CONSTRAINTS.md",
			purpose: "Technical constraints",
			required: true,
			expectedSections: ["Performance Budgets", "Browser Support", "Dependencies"],
		},
	],

	recommendedStructure: {
		root: ".llm-context",
		directories: ["patterns", "constraints"],
		files: [
			{
				path: ".llm-context/ARCHITECTURE.md",
				purpose: "React architecture",
				required: true,
				template: `# Architecture

## Overview
[Brief description of the application]

## Directory Structure
\`\`\`
src/
├── components/      # Reusable UI components
├── pages/           # Route pages
├── hooks/           # Custom hooks
├── context/         # React context providers
├── services/        # API services
├── store/           # State management
└── utils/           # Utilities
\`\`\`

## Component Hierarchy
[Describe component organization]

## Data Flow
[Describe data flow patterns]
`,
			},
			{
				path: ".llm-context/PATTERNS.md",
				purpose: "React patterns",
				required: true,
				template: `# Patterns

## Component Patterns
- Composition over inheritance
- Container/Presentational split
- Custom hooks for logic

## Hook Patterns
[Describe hook conventions]

## State Management
[Describe state approach]

## Error Handling
- Error boundaries for UI errors
- Try-catch for async operations
- User-friendly error messages
`,
			},
		],
	},
};
