# Docker Deployment Checklist

## Phase 1: Local Development Setup

### Prerequisites
- [ ] Docker installed and running
- [ ] Docker Compose installed
- [ ] `.env.docker` file exists at project root
- [ ] All required environment variables set in `.env.docker`:
  - [ ] `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
  - [ ] `BETTER_AUTH_URL=http://api:3001`
  - [ ] `BETTER_AUTH_SECRET` (32+ characters)
  - [ ] `GOOGLE_CLIENT_ID` (from Google Cloud Console)
  - [ ] `GOOGLE_CLIENT_SECRET` (from Google Cloud Console)
  - [ ] `DATABASE_URL=postgresql://snapback:password@postgres:5432/snapback`
  - [ ] `POSTGRES_PASSWORD` (set to match DATABASE_URL)
  - [ ] `POSTGRES_USER=snapback`
  - [ ] `POSTGRES_DB=snapback`

### Validation Tests
- [ ] Run: `node scripts/validation/docker-config-red-tests.mjs`
- [ ] Expected output: `✓ Passed: 31, ✗ Failed: 0`
- [ ] All 31 validation tests passing

### Build Images
- [ ] Run: `docker-compose --env-file .env.docker build`
- [ ] Wait for build to complete (2-5 minutes)
- [ ] Verify no errors in build output
- [ ] Check images exist: `docker images | grep snapback`

### Start Services
- [ ] Run: `docker-compose --env-file .env.docker up -d`
- [ ] Wait 30 seconds for database migrations to run
- [ ] Check logs: `docker-compose logs api | head -20`
- [ ] Look for "✅ Migrations completed successfully" message

### Health Checks
- [ ] PostgreSQL ready: `docker-compose exec postgres pg_isready -U snapback`
- [ ] Redis ready: `docker-compose exec redis redis-cli ping` (responds with PONG)
- [ ] API health: `curl http://localhost:3001/api/health`
- [ ] Web health: `curl http://localhost:3000/api/health`
- [ ] MCP health: `curl http://localhost:3002/health`

### Database Verification
- [ ] Check tables exist: `docker-compose exec postgres psql -U snapback -d snapback -c "\dt"`
- [ ] Verify auth tables: `docker-compose exec postgres psql -U snapback -d snapback -c "SELECT COUNT(*) FROM \"user\";"`
- [ ] Expected: Auth tables exist (user, session, account, etc.)

### Automated Local Testing
- [ ] Run: `bash scripts/docker/local-deploy-test.sh`
- [ ] Answer prompts during execution
- [ ] Verify all health checks pass
- [ ] Review service summary output

---

## Phase 2: Local OAuth Testing

### Google OAuth Configuration (Local)
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Select project or create new one
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 Client ID (Web Application)
- [ ] Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
- [ ] Copy Client ID and Client Secret
- [ ] Update `.env.docker`:
  - [ ] `GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com`
  - [ ] `GOOGLE_CLIENT_SECRET=your_client_secret`

### Test OAuth Flow
- [ ] Restart API service: `docker-compose restart api`
- [ ] Wait 10 seconds for service to restart
- [ ] Open browser: `http://localhost:3000`
- [ ] Click "Sign in with Google"
- [ ] Complete Google OAuth flow
- [ ] Verify user account created in database:
  ```bash
  docker-compose exec postgres psql -U snapback -d snapback -c "SELECT id, email, name FROM \"user\" LIMIT 1;"
  ```
- [ ] Verify logged in successfully
- [ ] Check API logs for successful auth: `docker-compose logs api | grep -i "success\|user\|auth"`

### Test User Creation
- [ ] Sign out from application
- [ ] Sign in again with same Google account
- [ ] Verify session persists across requests
- [ ] Check session created: `docker-compose exec postgres psql -U snapback -d snapback -c "SELECT COUNT(*) FROM session;"`

### Optional: GitHub OAuth (Local)
- [ ] Go to GitHub Settings → Developer Settings → OAuth Apps
- [ ] Create new OAuth App
- [ ] Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
- [ ] Copy Client ID and Client Secret
- [ ] Update `.env.docker`:
  - [ ] `GITHUB_CLIENT_ID=your_client_id`
  - [ ] `GITHUB_CLIENT_SECRET=your_client_secret`
- [ ] Restart services: `docker-compose restart api`
- [ ] Test GitHub OAuth login

---

## Phase 3: Production Preparation

### Create Production Environment File
- [ ] Create `secrets.env` (NEVER commit this)
- [ ] Set production values:
  - [ ] `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`
  - [ ] `BETTER_AUTH_URL=https://api.yourdomain.com`
  - [ ] `BETTER_AUTH_SECRET` (generate: `openssl rand -base64 32`)
  - [ ] `DATABASE_URL=postgresql://produser:STRONG_PASSWORD@db.yourdomain.com:5432/snapback_prod`
  - [ ] `POSTGRES_PASSWORD=STRONG_PASSWORD`
  - [ ] `GOOGLE_CLIENT_ID` (from Google Cloud Console, production app)
  - [ ] `GOOGLE_CLIENT_SECRET` (production credentials)
  - [ ] `NODE_ENV=production`

### Database Setup (Managed Service)
- [ ] Choose managed database provider:
  - [ ] AWS RDS PostgreSQL
  - [ ] Supabase PostgreSQL
  - [ ] Railway PostgreSQL
  - [ ] Other managed service
- [ ] Create PostgreSQL database (13+)
- [ ] Create database user with password
- [ ] Configure backup settings
- [ ] Enable automatic backups (daily minimum)
- [ ] Test connection from local machine:
  ```bash
  psql postgresql://user:password@host:5432/snapback_prod
  ```
- [ ] Record connection string in `secrets.env`

### Cache Setup (Managed Service)
- [ ] Choose Redis provider:
  - [ ] AWS ElastiCache
  - [ ] Heroku Redis
  - [ ] Railway Redis
  - [ ] Other managed service
- [ ] Create Redis instance
- [ ] Configure password/auth token
- [ ] Enable TLS/encryption
- [ ] Test connection: `redis-cli -u redis://password@host:6379`
- [ ] Record connection string in `secrets.env`

### OAuth Provider Configuration (Production)
- [ ] **Google Cloud Console:**
  - [ ] Create new OAuth 2.0 Client ID (separate from development)
  - [ ] Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`
  - [ ] Copy production Client ID and Secret
  - [ ] Update `secrets.env` with production values
- [ ] **GitHub (if using):**
  - [ ] Create new OAuth App (production)
  - [ ] Set Authorization callback: `https://yourdomain.com/api/auth/callback/github`
  - [ ] Copy production Client ID and Secret
  - [ ] Update `secrets.env`

### Domain & SSL Setup
- [ ] Register domain (if not already done)
- [ ] DNS configuration:
  - [ ] Point `yourdomain.com` to your hosting/CDN
  - [ ] Point `api.yourdomain.com` to API service
  - [ ] Verify DNS resolution: `dig yourdomain.com`
- [ ] SSL Certificate (Let's Encrypt or CA):
  - [ ] Obtain certificate for `yourdomain.com` and `api.yourdomain.com`
  - [ ] Store certificate files securely
  - [ ] Set expiration reminder (90 days before expiry)

### Hosting Provider Setup (Choose One)

#### Option A: Fly.io
- [ ] Install flyctl CLI
- [ ] Login: `flyctl auth login`
- [ ] Create app: `flyctl launch`
- [ ] Set secrets:
  ```bash
  flyctl secrets set \
    NEXT_PUBLIC_SITE_URL=https://yourdomain.com \
    BETTER_AUTH_URL=https://api.yourdomain.com \
    BETTER_AUTH_SECRET=... \
    GOOGLE_CLIENT_ID=... \
    GOOGLE_CLIENT_SECRET=... \
    DATABASE_URL=postgresql://... \
    # ... other secrets from secrets.env
  ```
- [ ] Deploy: `flyctl deploy`
- [ ] Monitor: `flyctl logs`
- [ ] Verify services running: `flyctl status`

#### Option B: VPS/Server (Docker Compose)
- [ ] Provision VPS (DigitalOcean, Linode, AWS EC2, etc.)
- [ ] SSH into server
- [ ] Install Docker and Docker Compose
- [ ] Clone repository: `git clone https://github.com/your/snapback.git`
- [ ] Create `secrets.env` on server (with production values)
- [ ] Build images: `docker-compose build`
- [ ] Start services: `docker-compose --env-file secrets.env up -d`
- [ ] Configure nginx/reverse proxy for HTTPS
- [ ] Setup monitoring and log aggregation

#### Option C: Kubernetes
- [ ] Create Kubernetes cluster (GKE, EKS, AKS, etc.)
- [ ] Create namespace: `kubectl create namespace snapback`
- [ ] Create secrets: `kubectl create secret generic snapback-secrets ...`
- [ ] Apply manifests: `kubectl apply -f k8s/`
- [ ] Verify pods running: `kubectl get pods -n snapback`
- [ ] Setup ingress controller for HTTPS
- [ ] Configure horizontal pod autoscaling

---

## Phase 4: Production Validation

### Deployment Verification
- [ ] Services started without errors
- [ ] No error logs in startup: `docker-compose logs api | grep -i error`
- [ ] All services healthy:
  - [ ] `curl https://yourdomain.com/api/health`
  - [ ] `curl https://api.yourdomain.com/api/health`

### Database Verification
- [ ] Connect to production database
- [ ] Verify schema exists: `SELECT * FROM information_schema.tables WHERE table_schema='public' LIMIT 5;`
- [ ] Verify auth tables present: `SELECT COUNT(*) FROM "user";`
- [ ] Test backup: `pg_dump postgresql://... > backup.sql`

### OAuth Verification (Production)
- [ ] Go to `https://yourdomain.com`
- [ ] Click "Sign in with Google"
- [ ] Complete OAuth flow with production credentials
- [ ] Verify user created in production database
- [ ] Verify session created and persists
- [ ] Test logout and login again

### SSL/TLS Verification
- [ ] Verify HTTPS works: `curl -v https://yourdomain.com`
- [ ] Check certificate: `openssl s_client -connect yourdomain.com:443`
- [ ] Verify certificate is valid and not self-signed
- [ ] Verify certificate matches domain

### Performance & Monitoring Setup
- [ ] Configure monitoring service (Sentry, Datadog, New Relic, etc.)
- [ ] Setup log aggregation (ELK, Datadog, Heroku Logs, etc.)
- [ ] Configure alerts for:
  - [ ] High error rate (>1% errors)
  - [ ] Database connection pool exhausted
  - [ ] Memory usage >80%
  - [ ] API response time >2 seconds
- [ ] Setup uptime monitoring (StatusPage, UptimeRobot, etc.)

### Load Testing (Optional)
- [ ] Run load test against production API
- [ ] Test with 10+ concurrent users
- [ ] Monitor API response times and errors
- [ ] Verify database connections stable
- [ ] Check memory and CPU usage

---

## Phase 5: Maintenance & Security

### Regular Maintenance
- [ ] Weekly: Review logs for errors
- [ ] Weekly: Check disk usage on servers
- [ ] Monthly: Update dependencies: `pnpm update`
- [ ] Monthly: Review security advisories
- [ ] Monthly: Verify backups are working
- [ ] Quarterly: Review and optimize slow queries

### Security Checklist
- [ ] Verify OAuth secrets not committed to git
- [ ] Rotate secrets every 90 days:
  - [ ] `BETTER_AUTH_SECRET`
  - [ ] OAuth provider credentials
  - [ ] Database password
  - [ ] API keys
- [ ] Enable 2FA on cloud provider accounts
- [ ] Review database access logs for suspicious activity
- [ ] Setup WAF (Web Application Firewall) if using CDN
- [ ] Enable rate limiting on API endpoints
- [ ] Setup CORS properly (restrict to your domains)

### Backup & Recovery
- [ ] Daily: Automated database backups (managed service default)
- [ ] Weekly: Test restore from backup
- [ ] Monthly: Download backup copies to secure storage
- [ ] Document recovery procedures
- [ ] Test recovery procedures quarterly

### Scaling & Optimization
- [ ] Monitor API response times
- [ ] If avg response time >1 second:
  - [ ] Profile slow endpoints
  - [ ] Optimize database queries
  - [ ] Add caching (Redis)
  - [ ] Scale horizontally (add more replicas)
- [ ] Monitor database connections
- [ ] If connections near limit:
  - [ ] Implement connection pooling
  - [ ] Upgrade to larger DB instance
  - [ ] Optimize queries to reduce connection time

---

## Phase 6: CI/CD Pipeline (Optional)

### GitHub Actions Setup
- [ ] Create `.github/workflows/docker-deploy.yml`
- [ ] Configure workflow to:
  - [ ] Run validation tests on every commit
  - [ ] Build Docker images
  - [ ] Push to container registry
  - [ ] Deploy to production on main branch
- [ ] Setup branch protection rules
- [ ] Require CI pipeline to pass before merge

### Automated Testing
- [ ] Add unit tests for critical paths
- [ ] Add integration tests for OAuth flow
- [ ] Add E2E tests for user workflows
- [ ] Run tests in CI pipeline before deployment

### Automated Deployment
- [ ] Configure automatic deployment on push to main
- [ ] Setup rollback strategy for failed deployments
- [ ] Configure health check to verify deployment success
- [ ] Setup notifications for deployment events

---

## Phase 7: Documentation & Handoff

### Documentation Complete
- [ ] README updated with deployment instructions
- [ ] API documentation generated and accessible
- [ ] OAuth setup guide documented
- [ ] Environment variables reference documented
- [ ] Troubleshooting guide created
- [ ] Architecture diagram documented
- [ ] Database schema documented

### Runbooks Created
- [ ] Incident response runbook
- [ ] Database recovery runbook
- [ ] Scaling procedures documented
- [ ] Emergency shutdown procedures
- [ ] Rollback procedures

### Team Knowledge Transfer
- [ ] Team trained on deployment process
- [ ] Team trained on monitoring dashboards
- [ ] On-call rotation established
- [ ] Escalation procedures documented
- [ ] Contact information documented

---

## Summary & Sign-Off

### Completion Status

**Local Development:**
- [x] Docker deployment working
- [x] OAuth login tested
- [x] Database migrations verified

**Production Ready:**
- [ ] Database configured and verified
- [ ] OAuth providers configured
- [ ] Domain and SSL setup
- [ ] Services deployed and healthy
- [ ] Monitoring and alerting active
- [ ] Backups verified working

**Optional Enhancements:**
- [ ] CI/CD pipeline setup
- [ ] Load testing completed
- [ ] Performance optimization done
- [ ] Security hardening complete

### Sign-Off

- [ ] **Development Lead:** Approved local deployment
- [ ] **DevOps/Infrastructure:** Approved production setup
- [ ] **Security Team:** Approved security configuration
- [ ] **Product Manager:** Approved for release

---

**Deployment Started:** [Date]
**Local Testing Completed:** [Date]
**Production Deployment Date:** [Date]
**Final Sign-Off Date:** [Date]

**Notes:**
```
[Use this section to document any deviations, issues encountered, or special configurations]
```
