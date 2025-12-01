# SnapBack API Service Environment Configuration

## Overview
This document provides a comprehensive overview of the environment configuration for the SnapBack API service, detailing all required and optional environment variables, their purposes, and configuration examples.

## Core Configuration

### Database Configuration
The API service requires a PostgreSQL database for data storage:

```env
# Primary database connection
DATABASE_URL="postgresql://username:password@host:port/database_name"

# Direct connection for migrations (if different from DATABASE_URL)
DIRECT_URL="postgresql://username:password@host:port/database_name"
```

**Security Considerations:**
- Never commit database credentials to version control
- Use environment-specific credentials for different environments
- Rotate credentials regularly

### Redis Configuration
Redis is used for caching, session storage, and rate limiting:

```env
# Redis connection string
REDIS_URL="redis://username:password@host:port/database"
```

**Security Considerations:**
- Use authentication for Redis instances
- Enable TLS for production deployments
- Configure appropriate timeouts and eviction policies

### Authentication Configuration
Better Auth is used for user authentication:

```env
# Secret key for authentication (minimum 32 characters)
BETTER_AUTH_SECRET="your-super-secret-auth-key-min-32-chars"

# Base URL for the auth service
BETTER_AUTH_URL="http://localhost:3001"
```

**Security Considerations:**
- Generate strong, random secrets
- Store secrets securely (e.g., using secret management services)
- Rotate secrets periodically

## Application Configuration

### Basic Settings
```env
# Environment mode
NODE_ENV="development"  # or "production"

# Port to run the API service on
PORT=3001

# Base URL for the API service
APP_URL="http://localhost:3001"

# Logging level
LOG_LEVEL="info"  # debug, info, warn, error
```

### Security Settings
```env
# Rules Signing Key (for secure JWS signing of rules bundles)
RULES_SIGNING_KEY="your-rules-signing-key-min-32-chars"

# Turnstile (Cloudflare CAPTCHA)
TURNSTILE_SECRET_KEY="your_turnstile_secret_key_here"
```

## Optional Service Integrations

### OAuth Providers
```env
# GitHub OAuth
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

### Payment Processing
```env
# Stripe
STRIPE_SECRET_KEY="sk_live_your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_live_your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_stripe_webhook_secret"
```

### Email Services
```env
# Resend
RESEND_API_KEY="re_your_resend_api_key"
```

### Analytics
```env
# PostHog
POSTHOG_API_KEY="phc_your_posthog_api_key"
```

### Error Tracking
```env
# Sentry
SENTRY_DSN="https://your_sentry_dsn"
```

### AI Services
```env
# OpenAI
OPENAI_API_KEY="sk-your_openai_api_key"
```

## CORS Configuration
Cross-Origin Resource Sharing is configured to allow requests from the web application:

```env
# Web application URL for CORS
WEB_APP_URL="http://localhost:3000"

# API service URL
API_URL="http://localhost:3001"
```

The CORS configuration in the server allows:
- Credentials (cookies) to be sent with requests
- Specific headers: Content-Type, Authorization, X-API-Key
- Specific methods: POST, GET, OPTIONS, PUT, DELETE, PATCH
- Exposed headers: Content-Length, X-RateLimit-Remaining, X-RateLimit-Reset

## Rate Limiting Configuration
Rate limits are configured by user plan:

```javascript
const RATE_LIMITS = {
  free: {
    requests: 100,
    windowMs: 60000, // 1 minute
  },
  pro: {
    requests: 1000,
    windowMs: 60000, // 1 minute
  },
  team: {
    requests: 5000,
    windowMs: 60000, // 1 minute
  },
};
```

## Development vs Production Configuration

### Development Environment
```env
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug
BETTER_AUTH_URL=http://localhost:3001
WEB_APP_URL=http://localhost:3000
API_URL=http://localhost:3001
```

### Production Environment
```env
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
BETTER_AUTH_URL=https://api.yourdomain.com
WEB_APP_URL=https://app.yourdomain.com
API_URL=https://api.yourdomain.com
```

## Containerization Configuration

### Docker Environment
When running in Docker, environment variables can be passed using:

```bash
docker run -e DATABASE_URL=your_database_url -e BETTER_AUTH_SECRET=your_auth_secret your-api-image
```

### Docker Compose Environment
In docker-compose.yml:

```yaml
services:
  api:
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/db
      - BETTER_AUTH_SECRET=your_secret
      - NODE_ENV=production
```

## Cloud Platform Configuration

### fly.io Deployment
For fly.io deployment, set secrets using:

```bash
flyctl secrets set DATABASE_URL=your_database_url
flyctl secrets set BETTER_AUTH_SECRET=your_auth_secret
flyctl secrets set REDIS_URL=your_redis_url
# ... other secrets
```

### Heroku Deployment
For Heroku deployment, set config vars using:

```bash
heroku config:set DATABASE_URL=your_database_url
heroku config:set BETTER_AUTH_SECRET=your_auth_secret
heroku config:set REDIS_URL=your_redis_url
# ... other config vars
```

## Security Best Practices

### 1. Secret Management
- Never store secrets in version control
- Use platform-specific secret management (fly.io secrets, Heroku config vars)
- Rotate secrets regularly
- Use different secrets for different environments

### 2. Environment Isolation
- Use separate databases for development, staging, and production
- Use different API keys for each environment
- Configure appropriate CORS settings for each environment

### 3. Access Control
- Restrict database access to only necessary services
- Use database roles with minimal required permissions
- Implement network-level access controls

### 4. Monitoring and Logging
- Enable detailed logging in development
- Use structured logging in production
- Monitor for unusual access patterns
- Set up alerts for security events

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database credentials
   - Ensure database service is running

2. **Authentication Errors**
   - Verify BETTER_AUTH_SECRET is set correctly
   - Check BETTER_AUTH_URL configuration
   - Ensure CORS settings allow authentication requests

3. **CORS Errors**
   - Verify WEB_APP_URL and API_URL are correctly configured
   - Check that the web app is making requests to the correct API URL

4. **Rate Limiting**
   - Monitor rate limit headers in API responses
   - Implement appropriate client-side rate limiting
   - Consider upgrading user plans for higher limits

### Debugging Tips

1. **Enable Debug Logging**
   ```env
   LOG_LEVEL=debug
   ```

2. **Check Environment Variables**
   ```bash
   # In the container or runtime environment
   printenv | grep SNAPBACK
   ```

3. **Test Database Connection**
   ```bash
   # Test database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   ```

4. **Verify Redis Connection**
   ```bash
   # Test Redis connectivity
   redis-cli -u $REDIS_URL ping
   ```

## Example Configuration Files

### .env.development
```env
# Database
DATABASE_URL="postgresql://snapback:snapback@localhost:5432/snapback_dev"
DIRECT_URL="postgresql://snapback:snapback@localhost:5432/snapback_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
BETTER_AUTH_SECRET="dev-secret-key-min-32-characters-long"
BETTER_AUTH_URL="http://localhost:3001"

# App
NODE_ENV=development
PORT=3001
APP_URL="http://localhost:3001"
LOG_LEVEL=debug

# CORS
WEB_APP_URL="http://localhost:3000"
API_URL="http://localhost:3001"

# Optional services (empty for development)
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
STRIPE_SECRET_KEY=""
```

### .env.production
```env
# Database
DATABASE_URL="postgresql://user:pass@prod-db-host:5432/snapback_prod"
DIRECT_URL="postgresql://user:pass@prod-db-host:5432/snapback_prod"

# Redis
REDIS_URL="rediss://user:pass@prod-redis-host:6380"

# Auth
BETTER_AUTH_SECRET="your-production-secret-key-min-32-characters"
BETTER_AUTH_URL="https://api.yourdomain.com"

# App
NODE_ENV=production
PORT=3001
APP_URL="https://api.yourdomain.com"
LOG_LEVEL=info

# CORS
WEB_APP_URL="https://app.yourdomain.com"
API_URL="https://api.yourdomain.com"

# External services
GITHUB_CLIENT_ID="your_production_github_client_id"
GITHUB_CLIENT_SECRET="your_production_github_client_secret"
STRIPE_SECRET_KEY="sk_live_your_production_stripe_secret"
STRIPE_PUBLISHABLE_KEY="pk_live_your_production_stripe_publishable"
STRIPE_WEBHOOK_SECRET="whsec_your_production_stripe_webhook_secret"
```

## Conclusion
Proper environment configuration is crucial for the secure and reliable operation of the SnapBack API service. By following the guidelines in this document, you can ensure that your API service is properly configured for development, testing, and production environments while maintaining security best practices.
