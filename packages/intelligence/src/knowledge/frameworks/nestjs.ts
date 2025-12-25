/**
 * NestJS Framework Configuration
 *
 * Pattern expectations and risk zones for NestJS applications.
 *
 * @module knowledge/frameworks/nestjs
 */

import type { FrameworkConfig } from "../types.js";

export const nestjsConfig: FrameworkConfig = {
	id: "nestjs",
	name: "NestJS",
	category: "backend",

	indicators: [
		{ type: "dependency", pattern: "@nestjs/core", weight: 0.95 },
		{ type: "dependency", pattern: "@nestjs/common", weight: 0.9 },
		{ type: "file", pattern: "nest-cli.json", weight: 0.95 },
		{ type: "file", pattern: "src/main.ts", weight: 0.5 },
	],

	expectedPatterns: [
		// Error Handling
		{
			id: "nestjs-exception-filter",
			name: "Exception Filters",
			description: "Global and local exception filters",
			category: "error-handling",
			importance: "critical",
			detection: {
				method: "content-match",
				pattern: "@Catch|ExceptionFilter|HttpException",
				files: ["src/**/*.ts"],
			},
			docs: "https://docs.nestjs.com/exception-filters",
		},
		{
			id: "nestjs-http-exceptions",
			name: "HTTP Exceptions",
			description: "Proper use of built-in HTTP exceptions",
			category: "error-handling",
			importance: "recommended",
			detection: {
				method: "content-match",
				pattern: "throw new (Http|Bad|Unauthorized|Forbidden|NotFound)Exception",
				files: ["src/**/*.ts"],
			},
		},

		// Validation
		{
			id: "nestjs-validation-pipe",
			name: "Validation Pipe",
			description: "Global validation with class-validator",
			category: "validation",
			importance: "critical",
			detection: {
				method: "dependency",
				pattern: "class-validator",
			},
		},
		{
			id: "nestjs-dto-validation",
			name: "DTO Validation",
			description: "DTOs with validation decorators",
			category: "validation",
			importance: "critical",
			detection: {
				method: "content-match",
				pattern: "@IsString|@IsNumber|@IsEmail|@IsNotEmpty",
				files: ["src/**/*.dto.ts", "src/**/dto/*.ts"],
			},
		},

		// Authentication
		{
			id: "nestjs-guards",
			name: "Authentication Guards",
			description: "Route protection with Guards",
			category: "authentication",
			importance: "critical",
			detection: {
				method: "content-match",
				pattern: "@UseGuards|CanActivate|AuthGuard",
				files: ["src/**/*.ts"],
			},
		},
		{
			id: "nestjs-passport",
			name: "Passport Integration",
			description: "Passport strategies for auth",
			category: "authentication",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "@nestjs/passport",
			},
		},

		// Security
		{
			id: "nestjs-helmet",
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
			id: "nestjs-throttler",
			name: "Rate Limiting",
			description: "Rate limiting with @nestjs/throttler",
			category: "security",
			importance: "critical",
			detection: {
				method: "dependency",
				pattern: "@nestjs/throttler",
			},
		},

		// Testing
		{
			id: "nestjs-testing-module",
			name: "Testing Module",
			description: "NestJS testing utilities",
			category: "testing",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "@nestjs/testing",
			},
		},
		{
			id: "nestjs-e2e-tests",
			name: "E2E Tests",
			description: "End-to-end API tests",
			category: "testing",
			importance: "recommended",
			detection: {
				method: "file-exists",
				pattern: "test/**/*.e2e-spec.ts",
			},
		},

		// Logging
		{
			id: "nestjs-logger",
			name: "Logger Service",
			description: "Structured logging with NestJS Logger",
			category: "logging",
			importance: "recommended",
			detection: {
				method: "content-match",
				pattern: "Logger|@nestjs/common.*Logger",
				files: ["src/**/*.ts"],
			},
		},

		// Configuration
		{
			id: "nestjs-config-module",
			name: "Config Module",
			description: "Environment configuration with @nestjs/config",
			category: "configuration",
			importance: "recommended",
			detection: {
				method: "dependency",
				pattern: "@nestjs/config",
			},
		},

		// Performance
		{
			id: "nestjs-caching",
			name: "Caching",
			description: "Cache manager integration",
			category: "performance",
			importance: "optional",
			detection: {
				method: "dependency",
				pattern: "@nestjs/cache-manager|cache-manager",
			},
		},
	],

	riskZones: [
		{
			id: "controllers",
			name: "Controllers",
			reason: "Request handling, input processing, response formatting",
			patterns: ["src/**/*.controller.ts"],
			severity: "high",
			requiredDocumentation: ["Endpoint documentation", "Request/response DTOs", "Error responses"],
		},
		{
			id: "services",
			name: "Services",
			reason: "Business logic, data access, external integrations",
			patterns: ["src/**/*.service.ts"],
			severity: "high",
			requiredDocumentation: ["Service responsibilities", "Dependencies", "Error handling"],
		},
		{
			id: "guards",
			name: "Guards",
			reason: "Authentication, authorization, access control",
			patterns: ["src/**/*.guard.ts", "src/auth/**"],
			severity: "critical",
			requiredDocumentation: ["Guard logic", "Protected routes", "Role requirements"],
		},
		{
			id: "entities",
			name: "Entities/Models",
			reason: "Database schema, relationships",
			patterns: ["src/**/*.entity.ts", "src/**/*.model.ts"],
			severity: "critical",
			requiredDocumentation: ["Schema design", "Relationships", "Constraints"],
		},
		{
			id: "modules",
			name: "Module Definitions",
			reason: "Dependency injection, module boundaries",
			patterns: ["src/**/*.module.ts"],
			severity: "medium",
			requiredDocumentation: ["Module responsibilities", "Exports", "Dependencies"],
		},
	],

	contextFiles: [
		{
			path: ".llm-context/ARCHITECTURE.md",
			purpose: "NestJS module architecture",
			required: true,
			expectedSections: ["Overview", "Module Structure", "Dependency Injection", "Data Flow"],
		},
		{
			path: ".llm-context/PATTERNS.md",
			purpose: "NestJS patterns and conventions",
			required: true,
			expectedSections: ["Error Handling", "Validation", "Authentication", "Testing"],
		},
		{
			path: ".llm-context/API.md",
			purpose: "API endpoint documentation",
			required: true,
			expectedSections: ["Endpoints", "DTOs", "Error Codes"],
		},
		{
			path: ".llm-context/CONSTRAINTS.md",
			purpose: "Technical constraints",
			required: true,
			expectedSections: ["Security", "Performance", "Dependencies"],
		},
	],

	recommendedStructure: {
		root: ".llm-context",
		directories: ["patterns", "modules"],
		files: [
			{
				path: ".llm-context/ARCHITECTURE.md",
				purpose: "NestJS architecture",
				required: true,
				template: `# Architecture

## Overview
[Brief description of the API]

## Module Structure
\`\`\`
src/
├── app.module.ts        # Root module
├── auth/                # Auth module
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── guards/
├── users/               # Users module
├── common/              # Shared utilities
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
└── config/              # Configuration
\`\`\`

## Dependency Injection
[Describe DI patterns]

## Data Flow
Request → Guards → Interceptors → Pipes → Controller → Service → Repository
`,
			},
			{
				path: ".llm-context/PATTERNS.md",
				purpose: "NestJS patterns",
				required: true,
				template: `# Patterns

## Error Handling
- Global exception filter for HTTP exceptions
- Custom exceptions extend HttpException
- Structured error responses

## Validation
- Global ValidationPipe with whitelist
- DTOs with class-validator decorators
- Transform enabled for type coercion

## Authentication
- JWT strategy with Passport
- Guards on controllers/routes
- Role-based access control

## Testing
- Unit tests for services
- E2E tests for controllers
- Test database for integration tests
`,
			},
		],
	},
};
