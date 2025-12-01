# SnapBack API Dependencies

## External Dependencies
These are dependencies that will need to be included in the apps/api package.json:

- `@hono/auth-js` - Hono authentication utilities
- `@hono/zod-validator` - Zod validation for Hono
- `@orpc/openapi` - oRPC OpenAPI generator
- `@orpc/server` - oRPC server implementation
- `@orpc/zod` - oRPC Zod integration
- `@scalar/hono-api-reference` - API documentation UI
- `better-auth` - Authentication library
- `drizzle-orm` - Database ORM
- `hono` - Web framework
- `jose` - JWT implementation
- `zod` - Schema validation

## Workspace Dependencies
These are internal packages that the API depends on:

- `@snapback/auth` - Authentication system
- `@snapback/config` - Configuration utilities
- `@snapback/config-legacy` - Legacy configuration
- `@snapback/contracts` - Shared types and interfaces
- `@snapback/core` - Core functionality
- `@snapback/events` - Event system
- `@snapback/infrastructure` - Infrastructure components (logging, etc.)
- `@snapback/integrations` - Third-party integrations (Stripe, etc.)
- `@snapback/platform` - Platform services (database, etc.)
- `@snapback/policy-engine` - Policy evaluation engine

## Shared Modules Within API
These are modules that are part of the API implementation:

- `orpc/` - oRPC implementation
- `src/` - Additional routes and services
- `modules/` - API modules (admin, analytics, auth, etc.)
- `middleware/` - Custom middleware
- `lib/` - Utility libraries

## Environment Variables Required
These environment variables are needed for the API to function:

### Database
- `DATABASE_URL` - PostgreSQL connection string

### Redis
- `REDIS_URL` - Redis connection string

### Authentication
- `BETTER_AUTH_SECRET` - Secret for authentication
- `BETTER_AUTH_URL` - Auth URL

### External Services
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `RESEND_API_KEY` - Resend email API key
- `OPENAI_API_KEY` - OpenAI API key (optional)

### Application
- `NODE_ENV` - Environment (development/production)
- `PORT` - Port to run the server on