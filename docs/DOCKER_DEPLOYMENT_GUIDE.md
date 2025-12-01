# Docker Deployment Guide - SnapBack

This guide covers deploying SnapBack using Docker for both **local development** and **production environments**.

## Quick Start - Local Development

### Prerequisites

- Docker and Docker Compose installed
- `.env.docker` file configured with credentials

### Local Deployment (30 seconds)

```bash
# 1. Load environment variables and start services
docker-compose --env-file .env.docker up -d

# 2. Monitor startup (migrations run automatically)
docker-compose logs -f api

# 3. Access services
- Web: http://localhost:3000
- API: http://localhost:3001
- MCP Server: http://localhost:3002
- Database: postgres (port 5432)
```

### Stopping Services

```bash
docker-compose --env-file .env.docker down

# Remove volumes (reset database)
docker-compose --env-file .env.docker down -v
```

---

## Production Deployment

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx/CDN)               │
│                 (HTTPS, caching, compression)              │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    ┌───▼──┐         ┌──▼───┐        ┌──▼────┐
    │  Web │         │ API  │        │  MCP  │
    │ 3000 │         │ 3001 │        │ 3002  │
    └───┬──┘         └──┬───┘        └──┬────┘
        │                │                │
        │         ┌──────┴────────┐       │
        │         │               │       │
    ┌───▼────────▼──────┬────────▼───┐
    │   PostgreSQL DB   │ Redis Cache │
    │    (Port 5432)    │ (Port 6379) │
    └────────────────────────────────┘
```

### Prerequisites for Production

- Kubernetes cluster OR Docker Swarm OR Docker hosting service (Fly.io, Railway, etc.)
- PostgreSQL database (managed service recommended)
- Redis cache (managed service recommended)
- SSL/TLS certificate (from Let's Encrypt or certificate authority)
- Secret management system (AWS Secrets Manager, HashiCorp Vault, etc.)
- Monitoring and logging (Prometheus, ELK, Datadog, etc.)

### Environment Variable Setup for Production

Create a `secrets.env` file (NEVER commit this):

```bash
# ============================================
# PRODUCTION ENVIRONMENT VARIABLES
# ============================================

# ============================================
# Database (use managed service in production)
# ============================================
DATABASE_URL=postgresql://produser:STRONG_PASSWORD_HERE@db.example.com:5432/snapback_prod
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE
POSTGRES_USER=snapback_prod
POSTGRES_DB=snapback_prod

# ============================================
# Redis (use managed service in production)
# ============================================
REDIS_URL=redis://redis.example.com:6379

# ============================================
# Authentication & OAuth (CRITICAL)
# ============================================
# Public URL that users/OAuth providers see
NEXT_PUBLIC_SITE_URL=https://snapback.example.com

# Internal service URL (use service names or internal DNS)
BETTER_AUTH_URL=https://api.snapback.example.com

# OAuth credentials from your providers
GOOGLE_CLIENT_ID=YOUR_PRODUCTION_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_PRODUCTION_GOOGLE_CLIENT_SECRET

GITHUB_CLIENT_ID=YOUR_PRODUCTION_GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=YOUR_PRODUCTION_GITHUB_CLIENT_SECRET

# Better Auth secret (generate: openssl rand -base64 32)
BETTER_AUTH_SECRET=YOUR_PRODUCTION_AUTH_SECRET_MIN_32_CHARS

# ============================================
# API Configuration
# ============================================
NEXT_PUBLIC_API_URL=https://api.snapback.example.com
API_URL=https://api.snapback.example.com

# ============================================
# Email Service
# ============================================
RESEND_API_KEY=YOUR_RESEND_API_KEY
SMTP_HOST=smtp.resend.com
SMTP_PORT=587

# ============================================
# Storage (S3 or compatible)
# ============================================
S3_ACCESS_KEY_ID=YOUR_S3_ACCESS_KEY
S3_SECRET_ACCESS_KEY=YOUR_S3_SECRET_KEY
S3_BUCKET_NAME=snapback-production
S3_REGION=us-east-1

# ============================================
# Payment Processing (Stripe)
# ============================================
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# ============================================
# Environment
# ============================================
NODE_ENV=production
```

### Deploy to Production

#### Option 1: Fly.io (Recommended)

```bash
# 1. Create fly.toml configuration
flyctl launch

# 2. Set secrets
flyctl secrets set \
  DATABASE_URL="postgresql://..." \
  GOOGLE_CLIENT_ID="..." \
  GOOGLE_CLIENT_SECRET="..." \
  BETTER_AUTH_SECRET="..." \
  # ... other secrets

# 3. Deploy
flyctl deploy
```

#### Option 2: Docker Compose (VPS/Server)

```bash
# 1. SSH into your production server
ssh user@your-server.com

# 2. Clone repository
git clone https://github.com/your/snapback.git
cd snapback

# 3. Create secrets.env with production values
nano secrets.env

# 4. Build images
docker-compose -f docker-compose.yml build

# 5. Start services with secret injection
docker-compose --env-file secrets.env up -d

# 6. Monitor
docker-compose logs -f api
docker-compose logs -f web
```

#### Option 3: Kubernetes

```bash
# 1. Create secrets from environment variables
kubectl create secret generic snapback-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=GOOGLE_CLIENT_ID="..." \
  # ... other secrets

# 2. Apply deployment manifests
kubectl apply -f k8s/namespace.yml
kubectl apply -f k8s/postgres-pvc.yml
kubectl apply -f k8s/api-deployment.yml
kubectl apply -f k8s/web-deployment.yml
kubectl apply -f k8s/mcp-deployment.yml

# 3. Monitor
kubectl get pods -n snapback
kubectl logs -f deployment/api -n snapback
```

### Production Database Setup

```bash
# 1. Connect to production database
psql postgresql://user:password@db.example.com:5432/snapback_prod

# 2. Verify migrations exist
# (automatically applied by docker-entrypoint.sh during container startup)

# 3. Create backup
pg_dump postgresql://user:password@db.example.com:5432/snapback_prod \
  > snapback_prod_backup.sql

# 4. Restore from backup if needed
psql postgresql://user:password@db.example.com:5432/snapback_prod \
  < snapback_prod_backup.sql
```

### Health Checks & Monitoring

#### Health Check Endpoints

```bash
# API health
curl https://api.snapback.example.com/api/health

# Expected response:
# {"status":"healthy","database":"connected","uptime":"12345"}
```

#### Logs & Monitoring

```bash
# Centralized logging
docker-compose logs -f

# Per-service logs
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f mcp-server

# Monitor resource usage
docker stats
```

#### Database Monitoring

```bash
# Active connections
SELECT count(*) FROM pg_stat_activity;

# Slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

# Disk usage
SELECT pg_size_pretty(pg_database_size('snapback_prod'));
```

---

## Environment Variable Reference

### Required Variables

| Variable | Local | Production | Description |
|----------|-------|------------|-------------|
| `NEXT_PUBLIC_SITE_URL` | http://localhost:3000 | https://yourdomain.com | Public URL (browser OAuth callbacks) |
| `BETTER_AUTH_URL` | http://api:3001 | https://api.yourdomain.com | Internal auth service URL |
| `BETTER_AUTH_SECRET` | Any 32+ chars | Secure secret | Session encryption key |
| `DATABASE_URL` | postgresql://snapback:password@postgres:5432/snapback | postgresql://user:pass@host:5432/db | Database connection |
| `GOOGLE_CLIENT_ID` | your-client-id | your-client-id | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | your-secret | your-secret | From Google Cloud Console |
| `NODE_ENV` | development | production | Deployment environment |

### Optional Variables

- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - GitHub OAuth
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` - Payment processing
- `RESEND_API_KEY` - Email service
- `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` - Cloud storage
- `OPENAI_API_KEY` - AI features

---

## Troubleshooting

### Issue: OAuth Login Fails

**Cause:** OAuth provider's redirect URI doesn't match `NEXT_PUBLIC_SITE_URL`

**Fix:**
1. Go to your OAuth provider (Google/GitHub)
2. Update redirect URIs to match:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`

### Issue: Database Connection Refused

**Cause:** Database not ready when API starts

**Fix:**
- API Dockerfile has entrypoint script that waits for database
- Check logs: `docker-compose logs api`
- Ensure `DATABASE_URL` is correct

### Issue: Migrations Failed

**Cause:** Schema already exists or permission issues

**Fix:**
```bash
# Reset database (development only!)
docker-compose down -v
docker-compose up -d

# Check migration status
docker-compose exec api sh
pnpm --filter @snapback/platform run db:push --print
```

### Issue: Port Already in Use

**Cause:** Another service using ports 3000, 3001, or 3002

**Fix:**
```bash
# Change ports in docker-compose.yml or .env.docker
WEB_PORT=3010
API_PORT=3011
MCP_PORT=3012
```

### Issue: Memory/CPU Limits Exceeded

**Cause:** Container resource limits insufficient

**Fix:** Update docker-compose.yml resource limits:
```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: "1"
    reservations:
      memory: 512M
      cpus: "0.5"
```

---

## Security Best Practices

1. **Never commit secrets** - Use `.env.docker.local` (gitignored) or environment variable injection
2. **Use HTTPS in production** - Enforce SSL/TLS on all endpoints
3. **Rotate secrets regularly** - Update OAuth credentials, API keys, auth secrets every 90 days
4. **Limit database access** - Use VPC/security groups to restrict database connections
5. **Monitor for attacks** - Set up intrusion detection and log analysis
6. **Keep dependencies updated** - Run `pnpm update` regularly and rebuild images

---

## Validation

Run validation tests to ensure Docker configuration is correct:

```bash
# Run RED phase validation tests
node scripts/validation/docker-config-red-tests.mjs

# Expected output: ✓ Passed: 31, ✗ Failed: 0
```

---

## References

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Node.js Docker Image](https://hub.docker.com/_/node)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Fly.io Deployment Guide](https://fly.io/docs/)

---

**Last Updated:** 2025-11-19
**Version:** 1.0.0
**Maintainer:** SnapBack Team
