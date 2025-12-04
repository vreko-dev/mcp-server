# Monitoring & Sentry Integration - Implementation Checklist

**Complete this checklist to fully set up monitoring and error tracking.**

---

## ✅ Phase 1: Dependencies & Configuration

- [ ] **Install Dependencies**
  ```bash
  pnpm install
  pnpm build
  ```
  - Installs Sentry packages (@sentry/node, @sentry/profiling-node)
  - Builds infrastructure package with Sentry exports

- [ ] **Verify Files Created**
  ```bash
  # Check these files exist:
  ls -la packages/infrastructure/src/sentry/index.ts
  ls -la apps/api/src/middleware/sentry.ts
  ```

- [ ] **Check Package Exports**
  ```bash
  # Sentry should be exported from infrastructure
  grep -r "sentry" packages/infrastructure/package.json
  ```

---

## ✅ Phase 2: Docker Environment Setup

- [ ] **Copy Environment Template**
  ```bash
  cp .env.docker.example .env.docker
  ```

- [ ] **Create Local Override File**
  ```bash
  touch .env.docker.local
  cat > .env.docker.local << 'EOF'
  # Add your local overrides here
  # SENTRY_DSN=https://your-dsn@sentry.io/project-id
  # DISABLE_SENTRY=false
  EOF
  ```

- [ ] **Verify Docker Compose Configuration**
  ```bash
  # Check services are properly configured
  grep -A 3 "SENTRY_DSN" docker-compose.holistic.yml
  grep -A 3 "JAEGER_AGENT" docker-compose.holistic.yml
  ```

---

## ✅ Phase 3: Sentry Setup (Choose One)

### Option A: Use Sentry Cloud (Recommended)

- [ ] **Create Sentry Account**
  - Visit https://sentry.io
  - Sign up for free account
  - Create organization "SnapBack"

- [ ] **Create Projects**
  - Create "SnapBack API" project (Node.js)
  - Create "SnapBack Web" project (Next.js)
  - Note the DSN URLs

- [ ] **Add DSN to Environment**
  ```bash
  # Edit .env.docker.local
  SENTRY_DSN=https://xxxxx@sentry.io/project-id
  DISABLE_SENTRY=false
  ```

### Option B: Self-Hosted Sentry

- [ ] **Deploy Sentry**
  - Follow https://docs.sentry.io/product/sentry-on-premise/
  - Note self-hosted URL

- [ ] **Add Self-Hosted DSN**
  ```bash
  SENTRY_DSN=https://your-key@your-sentry.com/project-id
  ```

### Option C: Skip for Now (Development Only)

- [ ] **Keep Sentry Disabled**
  ```bash
  DISABLE_SENTRY=true
  # Error tracking disabled, other monitoring still works
  ```

---

## ✅ Phase 4: Start Services

- [ ] **Start Holistic Environment**
  ```bash
  make dev-holistic
  # Or: docker-compose -f docker-compose.holistic.yml up -d
  ```

- [ ] **Wait for Services to Be Healthy**
  ```bash
  docker-compose -f docker-compose.holistic.yml ps
  # All should show "HEALTHY" or "Up"
  ```

- [ ] **Verify Sentry Initialization** (if enabled)
  ```bash
  docker-compose -f docker-compose.holistic.yml logs api | grep -i sentry
  # Should see: "✅ Sentry initialized for API error tracking"
  ```

---

## ✅ Phase 5: Verify Monitoring Services

- [ ] **Access Prometheus**
  ```bash
  open http://localhost:9090
  # Should see Prometheus UI
  # Check targets at: http://localhost:9090/targets
  ```

- [ ] **Access Grafana**
  ```bash
  open http://localhost:3002
  # Login: admin / admin
  # Should see home page
  ```

- [ ] **Access Jaeger**
  ```bash
  open http://localhost:16686
  # Should see service list
  ```

- [ ] **Access Redis Insight**
  ```bash
  open http://localhost:8001
  # Should see Redis information
  ```

---

## ✅ Phase 6: Test Sentry Integration (if enabled)

- [ ] **Trigger Test Error**
  ```bash
  curl http://api.snapback.dev:8080/api/test/error
  # Should return 500 error
  ```

- [ ] **Verify Error in Sentry**
  ```bash
  # If using Sentry Cloud
  open https://sentry.io/organizations/your-org/issues/

  # Should see new error from /api/test/error
  ```

- [ ] **Check Breadcrumbs**
  - Click on error in Sentry
  - View "Breadcrumbs" section
  - Should show HTTP requests and events leading to error

- [ ] **Check User Context** (if applicable)
  - Trigger error with authenticated user
  - Check "User" section in Sentry
  - Should show user ID/email

---

## ✅ Phase 7: Verify Metrics Collection

- [ ] **Check Prometheus Metrics**
  ```bash
  # In Prometheus UI (http://localhost:9090)
  # Query: up
  # Should show scrape targets as 1 (up)
  ```

- [ ] **Query Application Metrics**
  ```bash
  # In Prometheus UI
  # Query: api_requests_total
  # Should return data points
  ```

- [ ] **View Available Metrics**
  ```bash
  curl http://api.snapback.dev:8080/metrics
  # Should return Prometheus metric text format
  ```

---

## ✅ Phase 8: Verify Logging

- [ ] **Check API Logs**
  ```bash
  docker-compose -f docker-compose.holistic.yml logs api --tail=50
  # Should see structured JSON logs
  ```

- [ ] **Check Web Logs**
  ```bash
  docker-compose -f docker-compose.holistic.yml logs web --tail=50
  # Should see Next.js startup and requests
  ```

- [ ] **Log Levels Are Correct**
  ```bash
  # Should see INFO, DEBUG, ERROR messages
  # Check that WARN/ERROR messages are meaningful
  ```

---

## ✅ Phase 9: Test Debugging Features

- [ ] **Attach Debugger to API** (Optional)
  ```bash
  # In VS Code:
  # 1. Go to Run → Start Debugging
  # 2. Select "Debug API (Docker)"
  # 3. Add breakpoint in apps/api/src/server.ts
  # 4. Make request: curl http://api.snapback.dev:8080/api/health
  # 5. Should pause at breakpoint
  ```

- [ ] **Access Database**
  ```bash
  docker-compose -f docker-compose.holistic.yml exec postgres psql -U snapback -d snapback
  # Should connect to database
  ```

- [ ] **Access Redis**
  ```bash
  docker-compose -f docker-compose.holistic.yml exec redis redis-cli ping
  # Should return: PONG
  ```

---

## ✅ Phase 10: Documentation & Team Handoff

- [ ] **Commit Files**
  ```bash
  git add .
  git commit -m "feat: implement monitoring and error tracking stack

  - Add Sentry error tracking with Hono middleware
  - Integrate Prometheus metrics collection
  - Configure Jaeger distributed tracing
  - Add Grafana dashboards setup
  - Include comprehensive monitoring guides
  - Enable Redis Insight for cache monitoring"
  ```

- [ ] **Share Documentation**
  - Email team: `MONITORING_QUICK_REFERENCE.md`
  - Post in Slack: `MONITORING_DEBUGGING_SETUP.md`
  - Add to wiki: `SENTRY_REINTEGRATION_STRATEGY.md`

- [ ] **Team Onboarding**
  - [ ] Explain Sentry dashboard
  - [ ] Demo error tracking workflow
  - [ ] Show Prometheus/Grafana metrics
  - [ ] Demo Jaeger tracing
  - [ ] Share quick reference guide

---

## ✅ Phase 11: Production Preparation

- [ ] **Review Sampling Rates**
  - Confirm tracesSampleRate for production (0.1 = 10%)
  - Verify profilesSampleRate (0.1 = 10%)

- [ ] **Configure Alerts**
  - [ ] Set up Sentry alerts for critical errors
  - [ ] Add Prometheus alert rules
  - [ ] Configure Grafana notifications (email, Slack)

- [ ] **Set Up Retention**
  - [ ] Sentry error retention (30 days default)
  - [ ] Prometheus metrics retention (15 days default)
  - [ ] Jaeger traces retention (72 hours default)

- [ ] **Security Review**
  - [ ] Ensure PII filtering in Sentry
  - [ ] Review headers scrubbed from errors
  - [ ] Confirm API keys not in logs
  - [ ] Verify auth tokens not exposed

---

## ✅ Phase 12: Monitoring & Iteration

- [ ] **Monitor Error Trends** (Weekly)
  ```bash
  # Check Sentry dashboard for:
  - New error types
  - Affected users
  - Error frequency trends
  - Regressions in releases
  ```

- [ ] **Review Metrics** (Weekly)
  ```bash
  # Check Prometheus for:
  - Request latency (p95, p99)
  - Error rate percentage
  - Database query performance
  - Cache hit rate
  ```

- [ ] **Improve Dashboards** (Bi-weekly)
  - Add new Grafana panels
  - Create team-specific dashboards
  - Set up SLO tracking

- [ ] **Optimize Sampling** (Monthly)
  - Reduce unnecessary spans
  - Target high-value operations
  - Balance cost vs. visibility

---

## 🎯 Success Criteria

You've successfully implemented monitoring when:

- ✅ Sentry captures and displays errors
- ✅ Prometheus collects application metrics
- ✅ Grafana displays metric dashboards
- ✅ Jaeger shows request traces
- ✅ Redis Insight displays cache stats
- ✅ Team can access all dashboards
- ✅ Errors are automatically alerted
- ✅ Debugging information is comprehensive
- ✅ Performance issues are identifiable
- ✅ User impact can be determined

---

## 🚨 Common Issues & Solutions

### Issue: "Sentry initialized" but errors not appearing

```bash
# Check:
1. SENTRY_DSN is correct (not empty)
2. DISABLE_SENTRY != "true"
3. Services restarted after env change
4. Error actually triggered
5. Check browser console for client errors

# Troubleshoot:
docker-compose -f docker-compose.holistic.yml logs api | grep -i sentry
curl -v http://api.snapback.dev:8080/api/test/error
```

### Issue: No metrics in Prometheus

```bash
# Check:
1. Services expose /metrics endpoint
2. Prometheus can reach services
3. Scrape configuration correct
4. Enough requests made (metrics need samples)

# Troubleshoot:
curl http://api.snapback.dev:8080/metrics
open http://localhost:9090/targets
```

### Issue: Port conflicts

```bash
# Solution:
lsof -i :8080  # Find what's using port
kill -9 <PID>   # Kill process
docker-compose -f docker-compose.holistic.yml up -d  # Restart
```

---

## 📞 Support

Need help?

1. **Check logs**: `docker-compose -f docker-compose.holistic.yml logs -f [service]`
2. **Read docs**: See files in root directory
3. **Test integration**: `curl http://api.snapback.dev:8080/api/test/error`
4. **Restart services**: `make clean-holistic && make dev-holistic`

---

## 📋 Maintenance

**Weekly**:
- Review error trends in Sentry
- Check metric anomalies in Prometheus
- Monitor disk space on monitoring servers

**Monthly**:
- Update Sentry SDK
- Review and optimize sampling rates
- Analyze retention costs
- Update dashboards with new insights

**Quarterly**:
- Security audit of monitoring setup
- Performance tuning of services
- Review tool choices (still best fit?)
- Plan improvements

---

**Setup Date**: _____________
**Completed By**: _____________
**Reviewed By**: _____________

---

**Status**: ✅ Ready to use when all phases complete!
