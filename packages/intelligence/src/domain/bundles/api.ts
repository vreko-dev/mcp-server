/**
 * API Domain Bundle
 *
 * Patterns for validating API endpoint implementation.
 * Covers input validation, error handling, response formatting,
 * and security best practices for HTTP APIs.
 *
 * @module domain/bundles/api
 */

import type { DomainBundle, DomainPattern } from "@snapback/core/analysis";

const patterns: DomainPattern[] = [
	{
		id: "api-input-validation",
		name: "Input Validation",
		description: "All API inputs must be validated using a schema validator (zod, joi, yup)",
		required: true,
		severity: "critical",
		detectWith: {
			astPattern: "zod.parse || schema.validate || yup.validate",
			keywords: ["zod", "joi", "yup", "validate", "parse", "schema"],
		},
		failureMessage: "API endpoint accepts input without schema validation",
		fixSuggestion: "Add input validation: const input = schema.parse(req.body)",
	},
	{
		id: "api-error-handling",
		name: "Structured Error Handling",
		description: "API errors should be caught and returned in a consistent format",
		required: true,
		severity: "high",
		detectWith: {
			astPattern: "try-catch && (res.status || throw)",
			keywords: ["try", "catch", "error", "status", "errorHandler"],
		},
		failureMessage: "API endpoint missing structured error handling",
		fixSuggestion: "Wrap handler in try-catch with consistent error response format",
	},
	{
		id: "api-no-stack-traces",
		name: "No Stack Traces in Production",
		description: "API error responses should not expose stack traces in production",
		required: true,
		severity: "high",
		detectWith: {
			astPattern: "!error.stack in response || process.env.NODE_ENV check",
			keywords: ["stack", "NODE_ENV", "production", "development"],
		},
		failureMessage: "API may expose stack traces in error responses",
		fixSuggestion: "Only include stack traces when NODE_ENV !== 'production'",
	},
	{
		id: "api-content-type",
		name: "Content-Type Headers",
		description: "API responses should set appropriate Content-Type headers",
		required: true,
		severity: "medium",
		detectWith: {
			astPattern: "res.json || res.setHeader('Content-Type')",
			keywords: ["Content-Type", "application/json", "json"],
		},
		failureMessage: "API response missing Content-Type header",
		fixSuggestion: "Use res.json() or explicitly set Content-Type header",
	},
	{
		id: "api-cors-config",
		name: "CORS Configuration",
		description: "Cross-origin requests should be explicitly configured, not use wildcard",
		required: true,
		severity: "high",
		detectWith: {
			astPattern: "cors && origin !== '*'",
			keywords: ["cors", "origin", "Access-Control"],
		},
		failureMessage: "CORS configured with wildcard origin (*)",
		fixSuggestion: "Specify allowed origins explicitly: cors({ origin: ['https://app.example.com'] })",
	},
	{
		id: "api-response-sanitization",
		name: "Response Data Sanitization",
		description: "Sensitive fields should be excluded from API responses",
		required: true,
		severity: "critical",
		detectWith: {
			astPattern: "select || omit || pick || exclude password/token/secret",
			keywords: ["select", "omit", "pick", "exclude", "sanitize"],
		},
		failureMessage: "API response may include sensitive fields (password, tokens, secrets)",
		fixSuggestion: "Use omit() or select() to exclude sensitive fields from responses",
	},
	{
		id: "api-method-validation",
		name: "HTTP Method Validation",
		description: "Endpoints should only accept intended HTTP methods",
		required: true,
		severity: "medium",
		detectWith: {
			astPattern: "app.get || app.post || app.put || router.method",
			keywords: ["get", "post", "put", "delete", "patch", "method"],
		},
		failureMessage: "Endpoint may accept unintended HTTP methods",
		fixSuggestion: "Use specific method handlers: app.post('/users', handler) not app.use('/users', handler)",
	},
	{
		id: "api-pagination",
		name: "Pagination for List Endpoints",
		description: "List endpoints should implement pagination to prevent memory issues",
		required: true,
		severity: "high",
		detectWith: {
			astPattern: "limit && (offset || page || cursor)",
			keywords: ["limit", "offset", "page", "cursor", "pagination", "take", "skip"],
		},
		failureMessage: "List endpoint without pagination (potential memory/performance issue)",
		fixSuggestion: "Add pagination: query.limit(pageSize).offset(page * pageSize)",
	},
	{
		id: "api-request-size-limit",
		name: "Request Size Limit",
		description: "API should limit request body size to prevent DoS attacks",
		required: true,
		severity: "high",
		detectWith: {
			astPattern: "bodyParser.json({ limit }) || express.json({ limit })",
			keywords: ["limit", "bodyParser", "json", "urlencoded"],
		},
		failureMessage: "API accepts unlimited request body size",
		fixSuggestion: "Add body size limit: express.json({ limit: '1mb' })",
	},
];

/**
 * API domain pattern bundle
 */
export const apiPatterns: DomainBundle = {
	id: "api",
	name: "API Endpoints",
	description: "Patterns for secure and robust API endpoint implementation",
	patterns,
	applicableTo: ["api", "endpoint", "route", "handler", "controller", "rest", "graphql"],
};
