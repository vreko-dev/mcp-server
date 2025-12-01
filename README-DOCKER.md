# SnapBack Docker - Quick Reference

## 🚀 Quick Start (5 Minutes)

### 1. Setup Hosts File
```bash
sudo ./ops/scripts/setup-hosts.sh
```

### 2. Generate Secure Secrets
```bash
# Generate and copy these values
openssl rand -base64 32  # For POSTGRES_PASSWORD
openssl rand -base64 48  # For BETTER_AUTH_SECRET
```

### 3. Update Environment
```bash
nano .env.docker

# Update these two lines with values from step 2:
POSTGRES_PASSWORD=<paste-generated-password>
BETTER_AUTH_SECRET=<paste-generated-secret>
```

### 4. Start Everything
```bash
./ops/scripts/docker-start.sh
```

### 5. Access Application
- Main Site: http://snapback.dev
- Console: http://console.snapback.dev
- Docs: http://docs.snapback.dev
- API: http://api.snapback.dev:8080

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [DOCKER-SETUP-CHECKLIST.md](./docs/DOCKER-SETUP-CHECKLIST.md) | Complete step-by-step setup guide |
| [DOCKER-QUICK-START.md](./docs/DOCKER-QUICK-START.md) | Quick start for experienced users |
| [DOCKER-TROUBLESHOOTING.md](./docs/DOCKER-TROUBLESHOOTING.md) | Comprehensive troubleshooting guide |
| [DOCKER.md](./docs/DOCKER.md) | Full Docker documentation |

---

## 🛠️ Common Commands

### Start/Stop
```bash
# Start all services
./ops/scripts/docker-start.sh

# Stop all services
./ops/scripts/docker-stop.sh

# Restart a specific service
docker-compose -f docker-compose.dev.yml restart web
```

### Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f web
```

### Service Status
```bash
# Check all services
docker-compose -f docker-compose.dev.yml ps

# Check specific service
docker-compose -f docker-compose.dev.yml ps postgres
```

### Database
```bash
# Connect to database
docker-compose -f docker-compose.dev.yml exec postgres psql -U snapback -d snapback

# View tables
docker-compose -f docker-compose.dev.yml exec postgres psql -U snapback -d snapback -c "\dt"
```

### Debugging
```bash
# Access container shell
docker-compose -f docker-compose.dev.yml exec web sh

# Collect debug info
./ops/scripts/docker-debug.sh > debug.txt
```

---

## 🔧 Available Scripts

| Script | Purpose |
|--------|---------|
| `ops/scripts/docker-start.sh` | Start all services with validation |
| `ops/scripts/docker-stop.sh` | Stop all services gracefully |
| `ops/scripts/setup-hosts.sh` | Configure /etc/hosts for subdomains |
| `ops/scripts/docker-debug.sh` | Collect diagnostic information |

---

## 🌐 Service URLs

### Application
- **Main Site**: http://snapback.dev
- **Console**: http://console.snapback.dev
- **Docs**: http://docs.snapback.dev
- **API**: http://api.snapback.dev:8080
- **MCP Server**: http://mcp.snapback.dev:8081

### Monitoring & Tools
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3002 (admin/admin)
- **Jaeger**: http://localhost:16686
- **MailHog**: http://localhost:8025

### Direct Access (Bypass Nginx)
- **Web**: http://localhost:3000
- **Docs**: http://localhost:3001
- **API**: http://localhost:8080
- **MCP**: http://localhost:8081

---

## ⚡ Architecture

```
                        ┌─────────────────┐
                        │  NGINX (Port 80)│
                        │  Reverse Proxy  │
                        └────────┬────────┘
                                 │
        ┌────────────┬───────────┼───────────┬────────────┐
        │            │           │           │            │
        ▼            ▼           ▼           ▼            ▼
    ┌──────┐    ┌──────┐    ┌──────┐   ┌──────┐    ┌─────────┐
    │ Web  │    │ Docs │    │ API  │   │ MCP  │    │ Tools   │
    │:3000 │    │:3000 │    │:8080 │   │:8081 │    │ (Multi) │
    └──┬───┘    └──────┘    └───┬──┘   └──────┘    └─────────┘
       │                        │
       │         ┌──────────────┴──────────────┐
       │         │                             │
       │         ▼                             ▼
       │    ┌──────────┐                  ┌───────┐
       └───▶│ Postgres │                  │ Redis │
            │  :5432   │                  │ :6379 │
            └──────────┘                  └───────┘
```

---

## 🐛 Troubleshooting Quick Fixes

### Services won't start
```bash
# Check logs
docker-compose -f docker-compose.dev.yml logs

# Rebuild
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

### Can't access subdomains
```bash
# Verify hosts file
cat /etc/hosts | grep snapback

# Re-run setup if missing
sudo ./ops/scripts/setup-hosts.sh
```

### Database issues
```bash
# Reset database
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Port conflicts
```bash
# Find what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Complete reset
```bash
docker-compose -f docker-compose.dev.yml down -v
docker system prune -a
./ops/scripts/docker-start.sh
```

---

## 📋 Environment Variables

### Required (Must set in .env.docker)
- `POSTGRES_PASSWORD` - Database password (32+ chars)
- `BETTER_AUTH_SECRET` - Auth secret (32+ chars)

### Optional
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - GitHub OAuth
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `RESEND_API_KEY` - Email service
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` - Payments
- `OPENAI_API_KEY` - AI features

---

## 💡 Tips

1. **Use the startup script** - It validates everything before starting
2. **Check logs frequently** - `docker-compose logs -f` is your friend
3. **Keep Docker Desktop updated** - Latest version has bug fixes
4. **Allocate enough resources** - 8GB+ RAM recommended
5. **Use health checks** - Wait for all services to be healthy

---

## 🆘 Getting Help

1. **Read the docs**: Start with [DOCKER-SETUP-CHECKLIST.md](./docs/DOCKER-SETUP-CHECKLIST.md)
2. **Check troubleshooting**: See [DOCKER-TROUBLESHOOTING.md](./docs/DOCKER-TROUBLESHOOTING.md)
3. **Collect debug info**: Run `./ops/scripts/docker-debug.sh`
4. **Create an issue**: Include debug output

---

## ✅ Success Checklist

You're all set when:
- [ ] Docker Desktop is running
- [ ] /etc/hosts has subdomain entries
- [ ] .env.docker has real passwords (not placeholders)
- [ ] All services show "Up" status
- [ ] Can access http://snapback.dev
- [ ] Can access http://console.snapback.dev
- [ ] API health check works: http://api.snapback.dev:8080/api/health

---

**Happy coding! 🚀**
