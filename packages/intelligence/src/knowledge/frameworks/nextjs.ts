/**
 * Next.js Framework Configuration
 *
 * Pattern expectations and risk zones for Next.js applications.
 *
 * @module knowledge/frameworks/nextjs
 */

import type { FrameworkConfig } from "../types.js";

export const nextjsConfig: FrameworkConfig = {
	id: "nextjs",
	name: "Next.js",
	category: "fullstack",

	indicators: [
		{ type: "dependency", pattern: "next", weight: 0.95 },
		{ type: "file", pattern: "next.config.{js,mjs,ts}", weight: 0.9 },
		{ type: "file", pattern: "app/layout.{tsx,jsx,js,ts}", weight: 0.85 },
		{ type: "file", pattern: "pages/_app.{tsx,jsx,js,ts}", weight: 0.8 },
		{ type: "script", pattern: "next dev", weight: 0.7 },
	],

	expectedPatterns: [
		// Error Handling
		{
			id: "nextjs-error-boundary",
			name: "Error Boundary",
			description: "App-level error boundary using error.tsx",
			category: "error-handling",
			importance: "critical",
			detection: {
				method: "file-exists",
				pattern: "app/error.tsx",
				files: ["app/**/error.tsx"],
			},
			docs: "https://nextjs.org/docs/app/building-your-application/routing/error-handling",
		},
		{
			id: "nextjs-not-found",
			name: "Not Found Handler",
			description: "Custom 404 page using not-found.tsx",
			category: "error-handling",
			importance: "recommended",
			detection: {
				method: "file-exists",
				pattern: "app/not-found.tsx",
			},
		},
		{
			id: "nextjs-global-error",
			name: "Global Error Handler",
			description: "Root error boundary in app/global-error.tsx",
			category: "error-handling",
			importance: "critical",
			detection: {
				method: "file-exists",
				pattern: "app/global-error.tsx",
			},
		},

		// Data Fetching
		{
			id: "nextjs-server-actions",
			name: "Server Actions",
			description: "Form handling with 'use server' directive",
			category: "data-fetching",
			importance: "recommended",
			detection: {
				method: "content-match",
				pattern: '"use server"',
				files: ["app/**/*.{ts,tsx}", "actions/**/*.ts"],
			},
		},
		{
			id: "nextjs-loading-state",
			name: "Loading States",
			description: "Suspense-based loading with loading.tsx",
			category: "data-fetching",
			importance: "recommended",
			detection: {
				method: "file-exists",
				pattern: "app/**/loading.tsx",
			},
		},

		// Routing
		{
			id: "nextjs-middleware",
			name: "Middleware",
			description: "Edge middleware for auth/redirects",
			category: "routing",
			importance: "recommended",
			detection: {
				method: "file-exists",
				pattern: "middleware.ts",
			},
		},
		{
			id: "nextjs-parallel-routes",
			name: "Parallel Routes",
			description: "Simultaneous route rendering with @folder convention",
			category: "routing",
			importance: "optional",
			detection: {
				method: "file-exists",
				pattern: "app/**/@*",
			},
		},

		// Authentication
		{
			id: "nextjs-auth-middleware",
			name: "Auth Middleware",
			description: "Protected routes via middleware",
			category: "authentication",
			importance: "critical",
			detection: {
				method: "content-match",
				pattern: "getToken|getSession|auth\\(",
				files: ["middleware.ts"],
			},
		},

		// Validation
		{
			id: "nextjs-zod-validation",
			name: "Zod Validation",
			description: "Schema validation with Zod",
			category: "validation",
			importance: "recommended",
			detection: {
				method: "ast",
				pattern: "import.*zod|z\\.object",
				files: ["**/*.{ts,tsx}"],
			},
		},

		// Security
		{
			id: "nextjs-csp-headers",
			name: "CSP Headers",
			description: "Content Security Policy configuration",
			category: "security",
			importance: "recommended",
			detection: {
				method: "content-match",
				pattern: "Content-Security-Policy|contentSecurityPolicy",
				files: ["next.config.*", "middleware.ts"],
			},
		},

		// Testing
		{
			id: "nextjs-testing-setup",
			name: "Testing Setup",
			description: "Jest or Vitest configuration for Next.js",
			category: "testing",
			importance: "recommended",
			detection: {
				method: "file-exists",
				pattern: "{jest,vitest}.config.{js,ts,mjs}",
			},
		},

		// Performance
		{
			id: "nextjs-image-optimization",
			name: "Image Optimization",
			description: "Using next/image for optimized images",
			category: "performance",
			importance: "recommended",
			detection: {
				method: "content-match",
				pattern: "import.*Image.*from ['\"]next/image['\"]",
				files: ["**/*.{tsx,jsx}"],
			},
		},

		// Logging
		{
			id: "nextjs-structured-logging",
			name: "Structured Logging",
			description: "Consistent logging with pino or similar",
			category: "logging",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "pino|winston|bunyan",
			},
		},
	],

	riskZones: [
		{
			id: "api-routes",
			name: "API Routes",
			reason: "Direct database access, authentication, authorization logic",
			patterns: ["app/api/**", "pages/api/**"],
			severity: "critical",
			requiredDocumentation: [
				"Authentication requirements",
				"Rate limiting configuration",
				"Input validation schemas",
				"Error response formats",
			],
		},
		{
			id: "middleware",
			name: "Middleware",
			reason: "Request interception, auth checks, redirects",
			patterns: ["middleware.ts", "middleware.js"],
			severity: "critical",
			requiredDocumentation: ["Protected routes list", "Auth token handling", "Redirect logic"],
		},
		{
			id: "server-actions",
			name: "Server Actions",
			reason: "Direct server mutations, data modifications",
			patterns: ["app/**/actions.*", "actions/**"],
			severity: "high",
			requiredDocumentation: ["Action permissions", "Validation requirements", "Error handling strategy"],
		},
		{
			id: "env-config",
			name: "Environment Configuration",
			reason: "Secrets and environment-specific settings",
			patterns: [".env*", "next.config.*"],
			severity: "high",
			requiredDocumentation: [
				"Required environment variables",
				"Default values",
				"Production vs development differences",
			],
		},
		{
			id: "database-layer",
			name: "Database Layer",
			reason: "Data persistence, migrations, schema",
			patterns: ["prisma/**", "drizzle/**", "db/**", "lib/db*"],
			severity: "critical",
			requiredDocumentation: ["Schema overview", "Migration strategy", "Connection pooling", "Query patterns"],
		},
	],

	contextFiles: [
		{
			path: ".llm-context/ARCHITECTURE.md",
			purpose: "High-level system architecture and component relationships",
			required: true,
			expectedSections: ["Overview", "Directory Structure", "Data Flow", "Key Components"],
		},
		{
			path: ".llm-context/PATTERNS.md",
			purpose: "Coding patterns and conventions",
			required: true,
			expectedSections: ["Error Handling", "Data Fetching", "Authentication", "Validation"],
		},
		{
			path: ".llm-context/CONSTRAINTS.md",
			purpose: "Technical constraints and non-negotiables",
			required: true,
			expectedSections: ["Performance Budgets", "Security Requirements", "Dependencies"],
		},
		{
			path: ".llm-context/API.md",
			purpose: "API routes documentation",
			required: false,
			expectedSections: ["Endpoints", "Authentication", "Error Codes"],
		},
		{
			path: ".llm-context/DATABASE.md",
			purpose: "Database schema and patterns",
			required: false,
			expectedSections: ["Schema", "Relationships", "Migrations"],
		},
	],

	recommendedStructure: {
		root: ".llm-context",
		directories: ["patterns", "constraints", "examples"],
		files: [
			{
				path: ".llm-context/ARCHITECTURE.md",
				purpose: "System architecture documentation",
				required: true,
				template: `# Architecture

## Overview
[Brief description of the application]

## Directory Structure
\`\`\`
app/
├── (auth)/          # Auth-related routes
├── (dashboard)/     # Dashboard routes
├── api/             # API routes
└── layout.tsx       # Root layout
\`\`\`

## Data Flow
[Describe how data flows through the application]

## Key Components
[List and describe major components]
`,
			},
			{
				path: ".llm-context/PATTERNS.md",
				purpose: "Coding patterns and conventions",
				required: true,
				template: `# Patterns

## Error Handling
[Describe error handling approach]

## Data Fetching
[Describe data fetching patterns]

## Authentication
[Describe auth patterns]

## Validation
[Describe validation approach]
`,
			},
			{
				path: ".llm-context/CONSTRAINTS.md",
				purpose: "Technical constraints",
				required: true,
				template: `# Constraints

## Performance Budgets
- FCP < 1.8s
- LCP < 2.5s
- Bundle < 500KB initial

## Security Requirements
- [List security requirements]

## Dependencies
- [List dependency constraints]
`,
			},
		],
	},
};
