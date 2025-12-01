# SnapBack API Service Environment Configuration

## Overview
This document describes the environment variables required for the standalone API service.

## Required Environment Variables

### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string for the main database
- `DIRECT_URL` - Direct PostgreSQL connection string (for Drizzle migrations)

### Redis Configuration
- `REDIS_URL` - Redis connection string for caching and session storage

### Authentication Configuration
- `BETTER_AUTH_SECRET` - Secret key for authentication (minimum 32 characters)
- `BETTER_AUTH_URL` - Base URL for the auth service

### Application Configuration
- `NODE_ENV` - Environment mode (`development`, `production`, `test`)
- `PORT` - Port to run the API service on (default: 3001)
- `APP_URL` - Base URL for the API service
- `LOG_LEVEL` - Logging level (`debug`, `info`, `warn`, `error`)

### Security Configuration
- `RULES_SIGNING_KEY` - Key for signing rules bundles (minimum 32 characters)
- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile secret key for CAPTCHA

## Optional Environment Variables

### OAuth Providers
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Payment Processing
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

### Email Services
- `RESEND_API_KEY` - Resend API key for email sending

### Analytics
- `POSTHOG_API_KEY` - PostHog API key for analytics

### Error Tracking
- `SENTRY_DSN` - Sentry DSN for error tracking

### AI Services
- `OPENAI_API_KEY` - OpenAI API key for AI features

## CORS Configuration
The API service uses the following environment variables for CORS configuration:
- `WEB_APP_URL` - The URL of the web application (for CORS allowlist)
- `API_URL` - The URL of the API service

## Production Deployment
For production deployment, ensure all secrets are properly secured and environment variables are set according to your deployment platform's requirements.

### fly.io Deployment
When deploying to fly.io, you can set environment variables using:
```bash
flyctl secrets set DATABASE_URL=your_database_url
flyctl secrets set BETTER_AUTH_SECRET=your_auth_secret
# ... other secrets
```

### Docker Deployment
When using Docker, you can pass environment variables using:
```bash
docker run -e DATABASE_URL=your_database_url -e BETTER_AUTH_SECRET=your_auth_secret your-api-image
```

## Development Setup
For local development, copy the `.env.example` file to `.env` and fill in the appropriate values:
```bash
cp .env.example .env
# Edit .env with your configuration
```
