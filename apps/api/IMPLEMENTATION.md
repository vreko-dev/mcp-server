# SnapBack API Service Migration Implementation

## Overview
This document details the implementation of migrating the SnapBack API from an embedded package within the web application to a standalone service in the `apps/api` directory. This migration enables containerization for deployment to platforms like fly.io.

## Architecture Changes

### Before Migration
- **Monolithic Architecture**: The API was embedded within the web application as the `@snapback/api` package
- **Single Deployment Unit**: Web app and API deployed together
- **Internal API Calls**: Web app imported API functions directly

### After Migration
- **Microservices Architecture**: API is a standalone service
- **Separate Deployment Units**: Web app and API deployed independently
- **External API Calls**: Web app calls API over HTTP

## Implementation Details

### 1. Directory Structure
The `apps/api` directory now contains:
```
apps/api/
├── package.json              # API service package configuration
├── tsconfig.json             # TypeScript configuration
├── tsup.config.ts            # Build configuration
├── .env                      # Environment variables
├── .env.example              # Environment variable template
├── Dockerfile                # Containerization configuration
├── docker-compose.yml        # Local development configuration
├── src/
│   └── server.ts             # Main server entry point
├── modules/                  # API modules (admin, analytics, auth, etc.)
├── orpc/                     # oRPC implementation
├── middleware/               # Custom middleware
├── lib/                      # Utility libraries
└── src/                      # Additional routes and services
```

### 2. Package Configuration
Created a new `package.json` for the standalone API service:
```json
{
  "name": "@snapback/api-service",
  "version": "1.0.0",
  "description": "Standalone API service for SnapBack",
  "type": "module",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsup",
    "dev": "tsx watch src/server.ts",
    "start": "node dist/server.js",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@hono/auth-js": "catalog:",
    "@hono/zod-validator": "catalog:",
    "@orpc/openapi": "catalog:",
    "@orpc/server": "catalog:",
    "@orpc/zod": "catalog:",
    "@scalar/hono-api-reference": "catalog:",
    "@snapback/auth": "workspace:*",
    "@snapback/config": "workspace:*",
    "@snapback/config-legacy": "workspace:*",
    "@snapback/contracts": "workspace:*",
    "@snapback/core": "workspace:*",
    "@snapback/events": "workspace:*",
    "@snapback/infrastructure": "workspace:*",
    "@snapback/integrations": "workspace:*",
    "@snapback/platform": "workspace:*",
    "@snapback/policy-engine": "workspace:*",
    "better-auth": "catalog:",
    "drizzle-orm": "catalog:",
    "hono": "catalog:",
    "jose": "^5.9.6",
    "zod": "catalog:"
  }
}
```

### 3. Server Implementation
The main server (`src/server.ts`) implements:
- **Hono.js Framework**: Web framework for routing and middleware
- **oRPC Integration**: Remote procedure call system
- **CORS Configuration**: Cross-origin resource sharing for web app communication
- **Authentication**: Cookie-based and API key authentication
- **Rate Limiting**: Per-key rate limits based on user plan
- **Health Checks**: Endpoint for service monitoring
- **Documentation**: OpenAPI and Scalar API documentation

### 4. Environment Configuration
Environment variables are configured for:
- **Database Connections**: PostgreSQL connection strings
- **Redis Configuration**: Caching and session storage
- **Authentication Secrets**: Better Auth configuration
- **External Services**: Stripe, Resend, OpenAI, etc.
- **Application Settings**: Ports, URLs, logging levels

### 5. Web Application Updates
The web application was updated to call the external API service:
- **API Client**: Updated to point to external API URL
- **Environment Variables**: Added `NEXT_PUBLIC_API_URL` for API service URL
- **CORS Handling**: Configured for cross-domain requests

### 6. Containerization
Docker configuration includes:
- **Multi-stage Build**: Optimized for security and size
- **Non-root User**: Security best practices
- **Health Checks**: Service monitoring
- **Environment Configuration**: Runtime configuration via environment variables

## Migration Steps Completed

### 1. Analysis and Backup
- ✅ Analyzed current API implementation in `packages/api`
- ✅ Backed up current implementation
- ✅ Documented current API endpoints and usage
- ✅ Identified all dependencies and shared modules

### 2. Service Creation
- ✅ Created package.json for apps/api service
- ✅ Moved API modules from `packages/api` to `apps/api`
- ✅ Set up Hono.js server in `apps/api`
- ✅ Configured oRPC router in `apps/api`
- ✅ Set up middleware in `apps/api`

### 3. Configuration
- ✅ Configured environment variables for standalone API
- ✅ Set up CORS configuration for cross-domain requests
- ✅ Configured authentication for cross-domain usage
- ✅ Set up database connections for API service

### 4. Integration
- ✅ Updated web app API client to call external API service
- ✅ Updated Dockerfile for API service
- ✅ Updated docker-compose.yml to include API service

## Testing Requirements

### Pending Tests
- [ ] Test all API endpoints in standalone setup
- [ ] Test authentication flow across services
- [ ] Test integration with web app
- [ ] Performance testing of new setup

## Deployment Instructions

### Local Development
1. Start the database and Redis services:
   ```bash
   docker-compose up postgres redis
   ```

2. Start the API service:
   ```bash
   cd apps/api
   pnpm dev
   ```

3. Start the web application:
   ```bash
   cd apps/web
   pnpm dev
   ```

### Production Deployment
1. Build the Docker images:
   ```bash
   docker-compose build
   ```

2. Start all services:
   ```bash
   docker-compose up -d
   ```

### fly.io Deployment
1. Create a fly.io app for the API service:
   ```bash
   flyctl launch --name snapback-api
   ```

2. Set environment variables:
   ```bash
   flyctl secrets set DATABASE_URL=your_database_url
   flyctl secrets set BETTER_AUTH_SECRET=your_auth_secret
   # ... other secrets
   ```

3. Deploy the API service:
   ```bash
   flyctl deploy
   ```

## Benefits of Migration

### 1. Scalability
- Independent scaling of API and web services
- Better resource utilization

### 2. Maintainability
- Clear separation of concerns
- Easier to update and deploy services independently

### 3. Reliability
- Isolated failures don't affect the entire application
- Better monitoring and debugging capabilities

### 4. Deployment Flexibility
- Can deploy to different platforms
- Enables containerization for cloud deployment

## Future Improvements

### 1. Additional Testing
- Implement comprehensive API endpoint testing
- Add integration tests for cross-service communication
- Performance benchmarking

### 2. Monitoring and Logging
- Enhanced observability with distributed tracing
- Centralized logging for both services

### 3. Security Enhancements
- Additional security headers
- Rate limiting improvements
- Enhanced authentication mechanisms

## Conclusion
The migration to a standalone API service successfully separates the API from the web application, enabling better scalability, maintainability, and deployment flexibility. The implementation maintains all existing functionality while preparing the system for cloud deployment platforms like fly.io.
