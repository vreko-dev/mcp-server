# 🚀 Quick Start: Integration Testing & Deployment

**Generated**: December 24, 2025
**Purpose**: Fast deployment and integration testing guide

---

## ⚡ 30-Second Quick Start

```bash
# 1. One-command deployment with all integration tests
./scripts/integration-test-deploy.sh holistic

# That's it! 🎉
# Access at: http://snapback.dev
```

---

## 🎯 Choose Your Strategy

### Strategy 1: Holistic (Full Stack)
**Best for**: Pre-production validation, comprehensive testing
**Time**: ~15 minutes
**Includes**: All services + monitoring + debugging

```bash
./scripts/integration-test-deploy.sh holistic
# or
make dev-holistic
```

**You get**:
- ✅ Web, API, MCP, Docs
- ✅ PostgreSQL + Redis
- ✅ Prometheus, Grafana, Jaeger
- ✅ Email testing (Mailhog)
- ✅ Full health checks

---

### Strategy 2: Core Services
**Best for**: Standard development & integration testing
**Time**: ~8 minutes
**Includes**: Essential services only

```bash
./scripts/integration-test-deploy.sh core
# or
make dev
```

**You get**:
- ✅ Web (localhost:3000)
- ✅ API (localhost:3001)
- ✅ MCP (localhost:3002)
- ✅ PostgreSQL + Redis
- ✅ Mailhog

---

### Strategy 3: Minimal Infrastructure
**Best for**: Fast iteration, local development
**Time**: ~3 minutes
**Includes**: Database + Cache only

```bash
./scripts/integration-test-deploy.sh minimal
# or
make dev-minimal
```

**You get**:
- ✅ PostgreSQL (localhost:5432)
- ✅ Redis (localhost:6379)
- 📝 Run apps natively for hot reload

**Then start apps**:
```bash
# Terminal 1
pnpm --filter @snapback/web dev

# Terminal 2
pnpm --filter @snapback/api dev

# Terminal 3
pnpm --filter @snapback/docs dev

# Terminal 4
pnpm --filter @snapback/mcp-server dev
```

---

### Strategy 4: CI/CD Optimized
**Best for**: Automated pipelines, GitHub Actions
**Time**: ~20 minutes (includes tests)
**Includes**: Full test suite execution

```bash
./scripts/integration-test-deploy.sh ci
```

**You get**:
- ✅ Infrastructure deployment
- ✅ All packages built
- ✅ Unit tests run
- ✅ Integration tests run
- ✅ Contract tests run
- ✅ Health validation

---

## 📋 Pre-Flight Checklist

Before running any strategy:

```bash
# 1. Check prerequisites
docker --version
docker-compose --version
pnpm --version

# 2. Ensure environment file exists
ls .env.docker || cp .env.docker.example .env.docker

# 3. Set required variables in .env.docker
# - POSTGRES_PASSWORD
# - BETTER_AUTH_SECRET (32+ chars)
```

---

## 🔍 Verify Deployment

### Quick Health Check
```bash
# All services
make health

# Individual services
curl http://localhost:3000/api/health  # Web
curl http://localhost:3001/api/health  # API
curl http://localhost:3002/health      # MCP
```

### Check Logs
```bash
# All logs
make logs

# Specific service
make logs-web
make logs-api
make logs-mcp
make logs-db
```

### Monitor Services
```bash
# Container status
docker-compose ps

# Resource usage
docker stats

# Detailed service info
docker inspect snapback-web
```

---

## 🧪 Run Tests

### Unit Tests
```bash
pnpm test                    # All unit tests
pnpm test:coverage           # With coverage report
pnpm --filter @snapback/web test  # Specific package
```

### Integration Tests
```bash
pnpm test:integration        # All integration tests
pnpm --filter @snapback/api test:integration  # API integration
```

### E2E Tests
```bash
pnpm test:e2e               # All E2E tests
pnpm test:e2e:ui            # With Playwright UI
```

### Contract Tests
```bash
pnpm contract-test          # API contract validation
```

---

## 🛑 Stop Services

```bash
# Stop all (holistic)
make down-holistic

# Stop core services
make down

# Stop minimal infrastructure
make down-minimal

# Nuclear option (remove everything)
make clean
```

---

## 🚨 Troubleshooting

### Problem: Port Already in Use
```bash
# Find what's using the port
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Kill the process
kill -9 <PID>

# Or stop all SnapBack services
make down
```

### Problem: Services Won't Start
```bash
# Check logs
docker-compose logs

# Rebuild images
make rebuild

# Clean and restart
make clean
make dev
```

### Problem: Database Connection Failed
```bash
# Check database is running
docker-compose ps postgres

# Check database logs
make logs-db

# Test connection
docker-compose exec postgres pg_isready -U snapback

# Reset database
make db-reset
```

### Problem: Health Checks Failing
```bash
# View health check details
curl http://localhost:3001/api/health | jq .

# Check individual components
docker-compose exec postgres psql -U snapback -d snapback -c "SELECT 1"
docker-compose exec redis redis-cli ping

# Restart unhealthy service
docker-compose restart <service-name>
```

---

## 📊 Performance Expectations

| Strategy | Startup Time | Services | Memory Usage |
|----------|--------------|----------|--------------|
| Holistic | ~15 min | 12+ | ~6-8GB |
| Core | ~8 min | 6 | ~3-4GB |
| Minimal | ~3 min | 2 | ~1-2GB |
| CI | ~20 min | 6 + tests | ~4-5GB |

---

## 🎓 Pro Tips

### 1. Speed Up Builds
```bash
# Use Turbo cache
export TURBO_CACHE_DIR=~/.turbo-cache

# Skip unchanged packages
pnpm build --filter="...[origin/main]"
```

### 2. Debug Specific Service
```bash
# Shell into container
docker-compose exec web sh
docker-compose exec api sh

# View real-time logs
docker-compose logs -f web
```

### 3. Test Only Changed Code
```bash
# Run tests for changed files
pnpm test:changed

# Run affected tests
turbo run test --filter="...[origin/main]"
```

### 4. Create Deployment Snapshot
```bash
# Using SnapBack MCP (automatically done)
# Manual snapshot:
pnpm snapback create --reason "Pre-deployment snapshot"
```

---

## 🔗 Quick Commands Reference

### Deployment
```bash
make dev              # Core services
make dev-holistic     # Full stack
make dev-minimal      # Infrastructure only
make rebuild          # Rebuild all images
```

### Testing
```bash
pnpm test             # Unit tests
pnpm test:integration # Integration tests
pnpm test:e2e         # E2E tests
pnpm test:coverage    # Coverage report
```

### Monitoring
```bash
make health           # Health checks
make logs             # All logs
make logs-<service>   # Specific service logs
docker stats          # Resource usage
```

### Cleanup
```bash
make down             # Stop services
make down-holistic    # Stop holistic
make down-minimal     # Stop minimal
make clean            # Remove everything
```

---

## 🎯 Recommended Workflows

### Daily Development
```bash
make dev-minimal      # Fast startup
pnpm dev              # Native apps (hot reload)
```

### Integration Testing
```bash
make dev              # Core services
pnpm test:integration # Run integration tests
make health           # Verify health
```

### Pre-Production
```bash
./scripts/integration-test-deploy.sh holistic
# Wait for startup
make health           # Verify all services
pnpm test             # Run all tests
# Manual testing
make down-holistic    # Clean shutdown
```

### CI/CD Pipeline
```bash
./scripts/integration-test-deploy.sh ci
# Automated test execution
# Deploy to staging/production
```

---

## 📚 Next Steps

1. **Read**: [Full Deployment Strategy](./DEPLOYMENT_INTEGRATION_STRATEGY.md)
2. **Check**: [Docker Documentation](./docs/DOCKER.md)
3. **Review**: [Deployment Checklist](./docs/setup/DEPLOYMENT_CHECKLIST.md)
4. **Explore**: [Makefile](./Makefile) for all commands

---

## 🆘 Need Help?

### Common Issues
- Port conflicts → `lsof -i :<port>` and kill process
- Database errors → `make db-reset`
- Build failures → `make rebuild`
- Health check fails → `make logs-<service>`

### Resources
- [Quick Reference](./docs/QUICK_REFERENCE.md)
- [Workflow Guide](./docs/workflows/README.md)
- [Troubleshooting](./docs/DOCKER.md#troubleshooting)

---

**Last Updated**: December 24, 2025
**Status**: ✅ All strategies tested and operational
