# Middleware Integration

## Overview

Implementation of middleware components required for the revenue-first approach:

1. Authentication middleware
2. Rate limiting middleware
3. Usage tracking middleware

## Authentication Middleware

### Requirements

-   Validate JWT tokens from VS Code extension
-   Extract user information and plan details
-   Attach user context to request object

### Implementation Plan

-   Use existing JWT validation logic
-   Integrate with user database to fetch plan information
-   Implement caching for user plan data to reduce database queries

## Rate Limiting Middleware

### Requirements

-   Enforce limits based on user's subscription plan
-   Track requests per user
-   Return appropriate HTTP status codes when limits are exceeded

### Implementation Plan

-   Use Redis for tracking request counts
-   Define plan-specific rate limits:
    -   Free: 100 requests/hour
    -   Pro: 1000 requests/hour
    -   Enterprise: 10000 requests/hour
-   Implement sliding window algorithm for accurate rate limiting

## Usage Tracking Middleware

### Requirements

-   Count API calls toward user's usage limits
-   Track feature-specific usage (e.g., checkpoint creation)
-   Update usage counters in real-time

### Implementation Plan

-   Increment usage counters in Redis
-   Sync usage data to database periodically
-   Implement usage limit checking before processing requests

## Middleware Composition

The middleware will be composed in the following order:

1. Authentication middleware
2. Rate limiting middleware
3. Usage tracking middleware
4. Route handler

This composition ensures that requests are authenticated first, then rate-limited, then usage is tracked, and finally the actual request is processed.
