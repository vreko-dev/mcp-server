# SnapBack Docker - Troubleshooting Guide

Comprehensive troubleshooting guide for common Docker setup and runtime issues.

## Quick Diagnostics

Run these commands first to get a full picture:

```bash
# Check Docker status
docker info

# Check all services
docker-compose -f docker-compose.dev.yml ps

# Check logs (last 50 lines)
docker-compose -f docker-compose.dev.yml logs --tail=50

# Check disk space
docker system df
df -h

# Check ports in use
netstat -an | grep LISTEN | grep -E "3000|8080|5432|6379"
```

## Setup Issues

### 1. Hosts File Not Configured

**Symptoms:**
- Subdomains don't resolve (ERR_NAME_NOT_RESOLVED)
- Nginx returns 502 Bad Gateway
- Can access via localhost but not snapback.dev

**Solution:**
```bash
# Run the setup script
sudo ./ops/scripts/setup-hosts.sh

# Verify entries
cat /etc/hosts | grep snapback

# Should show:
# 127.0.0.1 snapback.dev
# 127.0.0.1 console.snapback.dev
# 127.0.0.1 docs.snapback.dev
# 127.0.0.1 api.snapback.dev
# 127.0.0.1 mcp.snapback.dev

# Clear DNS cache (macOS)
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Clear DNS cache (Linux)
sudo systemd-resolve --flush-caches
```

### 2. Environment Variables Not Set

**Symptoms:**
- Services fail to start with "environment variable not set" errors
- Database connection failures
- Auth errors

**Solution:**
```bash
# Check if .env.docker exists
ls -la .env.docker

# If not, create from example
cp .env.docker.example .env.docker

# Edit and set required values
nano .env.docker

# Minimum required:
# POSTGRES_PASSWORD=<your-secure-password>
# BETTER_AUTH_SECRET=<min-32-chars-secret>

# Validate configuration
grep -E "POSTGRES_PASSWORD|BETTER_AUTH_SECRET" .env.docker

# Restart services
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Docker Not Running

**Symptoms:**
- "Cannot connect to Docker daemon" errors
- `docker info` fails

**Solution:**
```bash
# macOS - Start Docker Desktop
open -a Docker

# Wait for Docker to start (check menu bar icon)

# Verify
docker info

# Linux - Start Docker daemon
sudo systemctl start docker
sudo systemctl enable docker
```

## Build Issues

### 4. Build Failures

**Symptoms:**
- "failed to solve" errors
- Timeout during build
- "No space left on device"

**Solution:**
```bash
# Clean build cache
docker builder prune -a

# Remove unused images
docker image prune -a

# Check disk space
docker system df
df -h

# Rebuild without cache
docker-compose -f docker-compose.dev.yml build --no-cache

# If still failing, check specific service logs
docker-compose -f docker-compose.dev.yml logs <service-name>
```

### 5. Dependency Installation Failures

**Symptoms:**
- "Failed to fetch" errors
- "Package not found" errors
- Build hangs at dependency installation

**Solution:**
```bash
# Clear pnpm store in container
docker-compose -f docker-compose.dev.yml down -v

# Rebuild images
docker-compose -f docker-compose.dev.yml build --no-cache

# If network issues, try with different DNS
# Edit docker daemon.json (macOS: ~/.docker/daemon.json)
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}

# Restart Docker Desktop
```

## Runtime Issues

### 6. Services Won't Start

**Symptoms:**
- Container exits immediately
- "Exited (1)" status
- No logs or minimal logs

**Diagnosis:**
```bash
# Check service status
docker-compose -f docker-compose.dev.yml ps

# Check logs for specific service
docker-compose -f docker-compose.dev.yml logs <service-name>

# Try starting in foreground to see errors
docker-compose -f docker-compose.dev.yml up <service-name>
```

**Common Causes:**

#### a) Port Already in Use
```bash
# Find what's using the port
lsof -i :3000  # Web
lsof -i :8080  # API
lsof -i :5432  # Postgres
lsof -i :6379  # Redis

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.dev.yml
```

#### b) Missing Dependencies
```bash
# Rebuild service
docker-compose -f docker-compose.dev.yml build <service-name>

# Start with fresh install
docker-compose -f docker-compose.dev.yml up -d --force-recreate <service-name>
```

#### c) Syntax Errors in Code
```bash
# Check logs for JavaScript/TypeScript errors
docker-compose -f docker-compose.dev.yml logs <service-name>

# Access container to debug
docker-compose -f docker-compose.dev.yml exec <service-name> sh
```

### 7. Database Connection Issues

**Symptoms:**
- "Connection refused" errors
- "Database does not exist" errors
- Services waiting forever for database

**Solution:**
```bash
# Check postgres is running
docker-compose -f docker-compose.dev.yml ps postgres

# Check postgres logs
docker-compose -f docker-compose.dev.yml logs postgres

# Test connection from host
docker-compose -f docker-compose.dev.yml exec postgres psql -U snapback -d snapback

# Test connection from another service
docker-compose -f docker-compose.dev.yml exec web sh
# Then: ping postgres (should resolve)

# Reset database completely
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d

# Check DATABASE_URL format (should use service name 'postgres')
# DATABASE_URL=postgresql://snapback:password@postgres:5432/snapback
```

### 8. Migrations Not Running

**Symptoms:**
- "Table does not exist" errors
- Empty database
- Migrations service shows "Completed" but tables missing

**Solution:**
```bash
# Check migrations logs
docker-compose -f docker-compose.dev.yml logs migrations

# Manually run migrations
docker-compose -f docker-compose.dev.yml run --rm migrations

# Check if migration files exist
ls -la packages/platform/drizzle/migrations/

# If no migrations, generate them
pnpm --filter @snapback/platform run drizzle-kit generate

# Verify tables exist
docker-compose -f docker-compose.dev.yml exec postgres psql -U snapback -d snapback -c "\dt"
```

### 9. Hot Reload Not Working

**Symptoms:**
- Code changes don't reflect
- Need to restart container to see changes
- File changes not detected

**Solution:**
```bash
# Verify volume mounts in docker-compose.dev.yml
# Should have:
# volumes:
#   - ./apps/web:/app/apps/web:cached

# Check if files are actually mounted
docker-compose -f docker-compose.dev.yml exec web ls -la /app/apps/web/src

# For macOS, ensure file system events work
# Add to docker-compose.dev.yml:
# environment:
#   - CHOKIDAR_USEPOLLING=true
#   - WATCHPACK_POLLING=true

# Restart service
docker-compose -f docker-compose.dev.yml restart web
```

### 10. Nginx 502 Bad Gateway

**Symptoms:**
- Subdomain returns 502 error
- Can access via port (e.g., :3000) but not via nginx

**Solution:**
```bash
# Check nginx logs
docker-compose -f docker-compose.dev.yml logs nginx

# Check if backend service is running
docker-compose -f docker-compose.dev.yml ps web api docs mcp

# Test backend directly (bypass nginx)
curl http://localhost:3000
curl http://localhost:8080/api/health

# Verify nginx can reach backend
docker-compose -f docker-compose.dev.yml exec nginx ping web

# Check nginx config
docker-compose -f docker-compose.dev.yml exec nginx cat /etc/nginx/nginx.conf

# Restart nginx
docker-compose -f docker-compose.dev.yml restart nginx
```

## Performance Issues

### 11. Slow Startup

**Symptoms:**
- Services take 5+ minutes to start
- Build takes very long
- Health checks timeout

**Solution:**
```bash
# Check Docker Desktop resources
# Increase CPU/Memory in Docker Desktop settings:
# - CPUs: 4+
# - Memory: 8GB+
# - Swap: 2GB+

# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Use cached builds
docker-compose -f docker-compose.dev.yml build --parallel

# Prune system but keep cache
docker system prune

# Check what's using resources
docker stats
```

### 12. High Memory Usage

**Symptoms:**
- Docker using >8GB RAM
- System slowing down
- Out of memory errors

**Solution:**
```bash
# Check current usage
docker stats

# Adjust resource limits in docker-compose.dev.yml
# Add to each service:
deploy:
  resources:
    limits:
      memory: 512M
    reservations:
      memory: 256M

# Restart with new limits
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d

# Reduce Redis memory
# In docker-compose.dev.yml:
command: redis-server --maxmemory 64mb
```

### 13. Disk Space Issues

**Symptoms:**
- "No space left on device"
- Build failures
- Cannot create volumes

**Solution:**
```bash
# Check disk usage
docker system df
df -h

# Clean up unused resources
docker system prune -a --volumes

# Remove specific items
docker image prune -a  # Remove unused images
docker volume prune    # Remove unused volumes
docker container prune # Remove stopped containers

# Keep only last 24h of logs
docker-compose -f docker-compose.dev.yml logs --since 24h > logs.txt

# Find large files
docker system df -v
```

## Network Issues

### 14. Container Cannot Reach Internet

**Symptoms:**
- Package installation fails
- Cannot pull images
- API calls to external services fail

**Solution:**
```bash
# Test DNS resolution
docker run --rm alpine ping google.com

# Check Docker DNS settings
cat ~/.docker/daemon.json

# Add/update DNS servers
{
  "dns": ["8.8.8.8", "8.8.4.4", "1.1.1.1"]
}

# Restart Docker
# macOS: Restart Docker Desktop
# Linux: sudo systemctl restart docker

# Test from service
docker-compose -f docker-compose.dev.yml exec web ping google.com
```

### 15. Services Cannot Communicate

**Symptoms:**
- API returns connection refused
- Web cannot reach API
- Services cannot see database

**Solution:**
```bash
# Check network exists
docker network ls | grep snapback

# Inspect network
docker network inspect snapback_snapback

# Verify services are on same network
docker-compose -f docker-compose.dev.yml ps

# Test connectivity
docker-compose -f docker-compose.dev.yml exec web ping api
docker-compose -f docker-compose.dev.yml exec web ping postgres

# Recreate network
docker-compose -f docker-compose.dev.yml down
docker network prune
docker-compose -f docker-compose.dev.yml up -d
```

## Data Issues

### 16. Data Not Persisting

**Symptoms:**
- Database resets on restart
- Uploaded files disappear
- Settings not saved

**Solution:**
```bash
# Check if volumes exist
docker volume ls | grep snapback

# Inspect volume
docker volume inspect snapback_postgres-data

# Ensure volumes defined in docker-compose.dev.yml:
# volumes:
#   postgres-data:
#   redis-data:

# And mounted correctly:
# services:
#   postgres:
#     volumes:
#       - postgres-data:/var/lib/postgresql/data

# Backup data before fixing
docker run --rm -v snapback_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# If volume is corrupted, recreate
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### 17. Cannot Access Database from Host

**Symptoms:**
- Cannot connect with TablePlus, DBeaver, etc.
- Connection refused on localhost:5432

**Solution:**
```bash
# Verify port is exposed
docker-compose -f docker-compose.dev.yml ps postgres

# Should show: 0.0.0.0:5432->5432/tcp

# Check if port is actually listening
lsof -i :5432

# Try connection
psql -h localhost -p 5432 -U snapback -d snapback

# If port conflict, change in docker-compose.dev.yml:
ports:
  - "5433:5432"  # Use 5433 on host

# Connection settings for GUI tools:
# Host: localhost
# Port: 5432
# Database: snapback
# Username: snapback
# Password: (from POSTGRES_PASSWORD in .env.docker)
```

## Advanced Debugging

### 18. Get Shell Access

```bash
# Access running container
docker-compose -f docker-compose.dev.yml exec web sh
docker-compose -f docker-compose.dev.yml exec api sh
docker-compose -f docker-compose.dev.yml exec postgres sh

# Run command in container
docker-compose -f docker-compose.dev.yml exec web node -e "console.log('test')"

# Start stopped container with shell
docker-compose -f docker-compose.dev.yml run --rm web sh
```

### 19. Inspect Container Environment

```bash
# View environment variables
docker-compose -f docker-compose.dev.yml exec web env

# View process list
docker-compose -f docker-compose.dev.yml exec web ps aux

# View file system
docker-compose -f docker-compose.dev.yml exec web ls -la /app

# Check network config
docker-compose -f docker-compose.dev.yml exec web cat /etc/hosts
```

### 20. Export Logs

```bash
# All logs to file
docker-compose -f docker-compose.dev.yml logs > logs.txt

# Specific service
docker-compose -f docker-compose.dev.yml logs web > web-logs.txt

# Last 100 lines with timestamps
docker-compose -f docker-compose.dev.yml logs --tail=100 -t > logs.txt

# Follow logs in real-time
docker-compose -f docker-compose.dev.yml logs -f | tee logs.txt
```

## Complete Reset

If all else fails, nuclear option:

```bash
# 1. Stop all services
docker-compose -f docker-compose.dev.yml down -v

# 2. Remove all SnapBack containers
docker ps -a | grep snapback | awk '{print $1}' | xargs docker rm -f

# 3. Remove all SnapBack images
docker images | grep snapback | awk '{print $3}' | xargs docker rmi -f

# 4. Remove all volumes
docker volume ls | grep snapback | awk '{print $2}' | xargs docker volume rm

# 5. Remove network
docker network rm snapback_snapback

# 6. Clean Docker system
docker system prune -a --volumes

# 7. Start fresh
./ops/scripts/docker-start.sh
```

## Getting Help

If you're still stuck:

1. **Collect diagnostic information:**
   ```bash
   ./ops/scripts/docker-debug.sh > debug-info.txt
   ```

2. **Check existing issues:**
   - GitHub Issues: https://github.com/snapback/snapback/issues

3. **Create a new issue with:**
   - Your OS and Docker version
   - Output of diagnostic commands
   - Relevant log excerpts
   - Steps to reproduce

4. **Join the community:**
   - Discord: [Link]
   - Discussions: [Link]
