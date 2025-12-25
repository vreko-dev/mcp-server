/**
 * Express Framework Configuration
 *
 * Pattern expectations and risk zones for Express.js applications.
 *
 * @module knowledge/frameworks/express
 */

import type { FrameworkConfig } from "../types.js";

export const expressConfig: FrameworkConfig = {
	id: "express",
	name: "Express",
	category: "backend",

	indicators: [
		{ type: "dependency", pattern: "express", weight: 0.95 },
		{ type: "content-match", pattern: "express\\(\\)", weight: 0.9 },
		{ type: "content-match", pattern: "app\\.listen", weight: 0.7 },
		{ type: "file", pattern: "app.{js,ts}", weight: 0.5 },
	],

	expectedPatterns: [
		// Error Handling
		{
			id: "express-error-middleware",
			name: "Error Middleware",
			description: "Centralized error handling middleware",
			category: "error-handling",
			importance: "critical",
			detection: {
				method: "content-match",
				pattern: "err.*req.*res.*next|error.*request.*response.*next",
				files: ["**/*.{js,ts}"],
			},
			docs: "https://expressjs.com/en/guide/error-handling.html",
		},
		{
			id: "express-async-errors",
			name: "Async Error Handling",
			description: "Proper async/await error handling with express-async-errors or wrapper",
			category: "error-handling",
			importance: "critical",
			detection: {
				method: "dependency",
				pattern: "express-async-errors|express-async-handler",
			},
		},
		{
			id: "express-not-found",
			name: "404 Handler",
			description: "Catch-all 404 handler for unmatched routes",
			category: "error-handling",
			importance: "recommended",
			detection: {
				method: "content-match",
				pattern: "404|Not Found",
				files: ["**/*.{js,ts}"],
			},
		},

		// Security
		{
			id: "express-helmet",
			name: "Helmet Security",
			description: "Security headers with Helmet",
			category: "security",
			importance: "critical",
			detection: {
				method: "dependency",
				pattern: "helmet",
			},
		},
		{
			id: "express-cors",
			name: "CORS Configuration",
			description: "Cross-origin resource sharing setup",
			category: "security",
			importance: "critical",
			detection: {
				method: "dependency",
				pattern: "cors",
			},
		},
		{
			id: "express-rate-limiting",
			name: "Rate Limiting",
			description: "Request rate limiting to prevent abuse",
			category: "security",
			importance: "critical",
			detection: {
				method: "dependency",
				pattern: "express-rate-limit|rate-limiter-flexible",
			},
		},

		// Validation
		{
			id: "express-input-validation",
			name: "Input Validation",
			description: "Request body/params validation",
			category: "validation",
			importance: "critical",
			detection: {
				method: "dependency",
				pattern: "express-validator|joi|zod|yup",
			},
		},

		// Logging
		{
			id: "express-request-logging",
			name: "Request Logging",
			description: "HTTP request logging middleware",
			category: "logging",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "morgan|pino-http|express-winston",
			},
		},

		// Authentication
		{
			id: "express-auth-middleware",
			name: "Auth Middleware",
			description: "Authentication middleware for protected routes",
			category: "authentication",
			importance: "critical",
			detection: {
				method: "content-match",
				pattern: "passport|jwt|authenticate|isAuthenticated",
				files: ["**/middleware/**/*.{js,ts}", "**/auth/**/*.{js,ts}"],
			},
		},

		// Testing
		{
			id: "express-testing",
			name: "API Testing",
			description: "Integration tests with supertest or similar",
			category: "testing",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "supertest",
			},
		},

		// Performance
		{
			id: "express-compression",
			name: "Response Compression",
			description: "Gzip/brotli compression middleware",
			category: "performance",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "compression",
			},
		},

		// Configuration
		{
			id: "express-env-config",
			name: "Environment Configuration",
			description: "Environment-based configuration management",
			category: "configuration",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "dotenv|config",
			},
		},
	],

	riskZones: [
		{
			id: "route-handlers",
			name: "Route Handlers",
			reason: "Business logic, data access, response formatting",
			patterns: ["routes/**", "controllers/**", "**/router.*"],
			severity: "high",
			requiredDocumentation: ["Endpoint contracts", "Request/response schemas", "Error responses"],
		},
		{
			id: "middleware",
			name: "Middleware Chain",
			reason: "Request processing, auth, validation",
			patterns: ["middleware/**", "**/middleware.*"],
			severity: "critical",
			requiredDocumentation: ["Middleware order", "Auth flow", "Error propagation"],
		},
		{
			id: "database-layer",
			name: "Database Layer",
			reason: "Data persistence, queries, transactions",
			patterns: ["models/**", "db/**", "repositories/**"],
			severity: "critical",
			requiredDocumentation: ["Schema definitions", "Query patterns", "Transaction handling"],
		},
		{
			id: "auth-module",
			name: "Authentication Module",
			reason: "User identity, sessions, tokens",
			patterns: ["auth/**", "**/passport.*", "**/jwt.*"],
			severity: "critical",
			requiredDocumentation: ["Auth strategies", "Token lifecycle", "Session management"],
		},
	],

	contextFiles: [
		{
			path: ".llm-context/ARCHITECTURE.md",
			purpose: "API architecture and component relationships",
			required: true,
			expectedSections: ["Overview", "Directory Structure", "Middleware Chain", "Route Structure"],
		},
		{
			path: ".llm-context/PATTERNS.md",
			purpose: "Coding patterns for Express development",
			required: true,
			expectedSections: ["Error Handling", "Validation", "Authentication", "Response Format"],
		},
		{
			path: ".llm-context/API.md",
			purpose: "API endpoint documentation",
			required: true,
			expectedSections: ["Endpoints", "Authentication", "Error Codes", "Rate Limits"],
		},
		{
			path: ".llm-context/CONSTRAINTS.md",
			purpose: "Technical constraints and requirements",
			required: true,
			expectedSections: ["Security Requirements", "Performance Targets", "Dependencies"],
		},
	],

	recommendedStructure: {
		root: ".llm-context",
		directories: ["patterns", "constraints"],
		files: [
			{
				path: ".llm-context/ARCHITECTURE.md",
				purpose: "API architecture",
				required: true,
				template: `# Architecture

## Overview
[Brief description of the API]

## Directory Structure
\`\`\`
src/
├── routes/          # Route definitions
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── models/          # Data models
├── services/        # Business logic
└── utils/           # Utilities
\`\`\`

## Middleware Chain
1. Helmet (security headers)
2. CORS
3. Body parser
4. Request logging
5. Authentication
6. Route handlers
7. Error handler

## Route Structure
[Describe route organization]
`,
			},
			{
				path: ".llm-context/PATTERNS.md",
				purpose: "Express patterns",
				required: true,
				template: `# Patterns

## Error Handling
- All async handlers wrapped with asyncHandler
- Centralized error middleware at end of chain
- Structured error responses

## Validation
- Request validation using [library]
- Schema-first approach

## Authentication
- [Describe auth approach]

## Response Format
\`\`\`json
{
  "success": true,
  "data": {},
  "meta": {}
}
\`\`\`
`,
			},
			{
				path: ".llm-context/API.md",
				purpose: "API documentation",
				required: true,
				template: `# API Documentation

## Base URL
\`/api/v1\`

## Authentication
[Describe auth mechanism]

## Endpoints

### GET /endpoint
[Description]

## Error Codes
| Code | Description |
|------|-------------|
| 400  | Bad Request |
| 401  | Unauthorized |
| 404  | Not Found |
| 500  | Internal Error |
`,
			},
		],
	},
};
