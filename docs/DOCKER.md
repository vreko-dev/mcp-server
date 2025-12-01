# Docker Deployment Guide for SnapBack

This guide covers containerized deployment of the SnapBack application using Docker and Docker Compose.

## Quick Start

### Development Environment

```bash
# Copy environment template
cp .env.docker.example .env.docker

# Edit environment variables (at minimum set POSTGRES_PASSWORD)
nano .env.docker

# Start development environment
docker-compose -f docker-compose.dev.yml --env-file .env.docker up -d

# Access application
open http://localhost:3000

# View logs
docker-compose -f docker-compose.dev.yml logs -f web
```

### Production Environment

```bash
# Copy and configure production environment
cp .env.docker.example .env.docker

# Set production values (see Environment Configuration section)
nano .env.docker

# Build production image
./scripts/docker-build.sh production

# Deploy to production
./scripts/docker-deploy.sh docker-compose.yml production

# Check status
./scripts/docker-deploy.sh status
```

## Architecture Overview

### Services

**Production Stack:**

-   **web**: Next.js 15 application (Node.js 20 Alpine)
-   **postgres**: PostgreSQL 16 database
-   **redis**: Redis 7 cache (optional)

**Development Stack:**

-   **web**: Development build with hot reload
-   **postgres**: Development database
-   **redis**: Development cache
-   **prisma-studio**: Database management UI (optional)
-   **mailhog**: Email testing (optional)

### Security Features

-   **Non-root containers**: All services run as non-privileged users
-   **Security hardening**: No-new-privileges, minimal attack surface
-   **Health checks**: Comprehensive application and infrastructure monitoring
-   **Resource limits**: CPU and memory constraints
-   **Network isolation**: Services communicate via dedicated network

## Environment Configuration

### Required Variables

**Database:**

```bash
POSTGRES_DB=snapback
POSTGRES_USER=snapback
POSTGRES_PASSWORD=your_secure_password_here  # REQUIRED
DATABASE_URL=postgresql://snapback:password@postgres:5432/snapback
```

**Authentication:**

```bash
BETTER_AUTH_SECRET=your_32_char_secret_here  # REQUIRED for production
BETTER_AUTH_URL=https://yourdomain.com      # REQUIRED for production
```

### Optional Variables

**OAuth Providers:**

```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Email Service (choose one):**

```bash
RESEND_API_KEY=re_xxxxxxxxx                 # Recommended
PLUNK_API_KEY=your_plunk_api_key
POSTMARK_API_KEY=your_postmark_api_key
```

**Storage:**

```bash
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-bucket-name
S3_REGION=us-east-1
```

**Payments (choose one):**

```bash
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

## Build Process

### Multi-stage Production Build

The production Dockerfile uses a multi-stage build optimized for:

1. **Layer caching**: Dependencies installed separately from source code
2. **Turbo prune**: Only includes files needed for the web app
3. **Prisma generation**: Database client generated before build
4. **Security**: Non-root user, minimal Alpine base
5. **Size optimization**: Production dependencies only in final image

### Build Commands

```bash
# Production build
./scripts/docker-build.sh production

# Development build
./scripts/docker-build.sh development

# Build both images
./scripts/docker-build.sh both

# Multi-platform build with push
PUSH_IMAGE=true PLATFORM=linux/amd64,linux/arm64 ./scripts/docker-build.sh production
```

## Deployment

### Development Deployment

```bash
# Start all services
docker-compose -f docker-compose.dev.yml --env-file .env.docker up -d

# Start with optional tools (Prisma Studio, Mailhog)
docker-compose -f docker-compose.dev.yml --env-file .env.docker --profile tools up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

**Development Features:**

-   Hot reload for code changes
-   Volume mounts for source code
-   Prisma Studio at http://localhost:5555
-   Mailhog for email testing at http://localhost:8025
-   Debug port 9229 exposed

### Production Deployment

```bash
# Deploy with automated health checks
./scripts/docker-deploy.sh docker-compose.yml production

# Deploy without backup (faster)
SKIP_BACKUP=true ./scripts/docker-deploy.sh

# Check deployment status
./scripts/docker-deploy.sh status

# Rollback to previous version
./scripts/docker-deploy.sh rollback
```

**Production Features:**

-   Automatic database backups before deployment
-   Health checks with timeout
-   Rolling updates
-   Resource monitoring
-   Automatic restart on failure

## Health Monitoring

### Health Check Endpoint

The application exposes a comprehensive health check at `/api/health`:

```bash
# Quick health check
curl http://localhost:3000/api/health

# Example response
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "checks": {
    "database": "healthy",
    "memory": "healthy"
  },
  "responseTime": 15
}
```

### Docker Health Checks

All services include Docker health checks:

```bash
# Check service health
docker-compose ps

# View health check logs
docker inspect snapback-web | grep -A 10 Health
```

## Database Management

### Migrations

```bash
# Run migrations in running container
docker-compose exec web pnpm --filter database run push

# Run migrations during deployment
./scripts/docker-deploy.sh  # Automatically runs migrations

# Manual migration with backup
./scripts/docker-deploy.sh --migrate-only
```

### Backups

```bash
# Manual backup
docker-compose exec postgres pg_dump -U snapback snapback | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Automatic backups (production deployment)
./scripts/docker-deploy.sh  # Creates backup in backups/ directory

# Restore from backup
zcat backup_20240101_120000.sql.gz | docker-compose exec -T postgres psql -U snapback snapback
```

### Prisma Studio

```bash
# Development: Start Prisma Studio
docker-compose -f docker-compose.dev.yml --profile tools up -d prisma-studio

# Access at http://localhost:5555

# Production: Temporary Prisma Studio
docker run --rm -it --network snapback_app-network \
  -e DATABASE_URL="postgresql://snapback:password@postgres:5432/snapback" \
  -p 5555:5555 \
  snapback:production pnpm --filter database run studio --hostname 0.0.0.0
```

## Scaling and Load Balancing

### Horizontal Scaling

```bash
# Scale web service to 3 replicas
docker-compose up -d --scale web=3

# Use nginx for load balancing
docker-compose -f docker-compose.yml -f docker-compose.nginx.yml up -d
```

### Resource Management

```yaml
# Adjust resource limits in docker-compose.yml
deploy:
    resources:
        limits:
            memory: 1G
            cpus: "1.0"
        reservations:
            memory: 512M
            cpus: "0.5"
```

## Troubleshooting

### Common Issues

**Container won't start:**

```bash
# Check logs
docker-compose logs web

# Check health status
docker-compose ps

# Restart service
docker-compose restart web
```

**Database connection issues:**

```bash
# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec web node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.\$connect().then(() => console.log('Connected')).catch(console.error);
"
```

**Build failures:**

```bash
# Clean build cache
docker builder prune

# Rebuild without cache
docker-compose build --no-cache

# Check disk space
df -h
docker system df
```

### Performance Issues

**High memory usage:**

```bash
# Monitor resource usage
docker stats

# Check Node.js memory
docker-compose exec web node -e "console.log(process.memoryUsage())"

# Adjust memory limits in docker-compose.yml
```

**Slow startup:**

```bash
# Check startup time
docker-compose logs web | grep "Ready"

# Optimize Prisma generation
# Already optimized in Dockerfile

# Use health checks to ensure readiness
curl http://localhost:3000/api/health
```

## Security Considerations

### Container Security

-   All containers run as non-root users
-   Security options enabled (`no-new-privileges`)
-   Minimal Alpine base images
-   Regular security updates

### Network Security

-   Services isolated in dedicated network
-   Database not exposed externally in production
-   Rate limiting via nginx (optional)

### Environment Security

-   Secrets managed via environment files
-   Production secrets should use Docker Secrets or external secret management
-   Environment files excluded from version control

### Recommendations

1. **Use Docker Secrets for production:**

    ```yaml
    services:
        web:
            secrets:
                - postgres_password
    secrets:
        postgres_password:
            external: true
    ```

2. **Implement log aggregation for production**
3. **Use external database for high availability**
4. **Implement regular security updates**
5. **Monitor resource usage and set up alerts**

## Next Steps

1. Set up CI/CD pipeline for automated deployments
2. Implement monitoring with Prometheus and Grafana
3. Configure log aggregation (ELK stack or similar)
4. Set up backup automation
5. Implement blue-green deployments for zero downtime

For advanced configuration and production best practices, see the production deployment documentation.
