# SnapBack Docker - Setup Checklist

Complete this checklist before starting Docker services.

## ☐ Step 1: Prerequisites

**Check Docker is installed and running:**
```bash
docker --version
docker info
```

Expected: Docker version 20+ and Docker info shows server details

**If not installed:**
- Download from: https://www.docker.com/products/docker-desktop
- Install and start Docker Desktop
- Wait for Docker icon in menu bar to show "Docker Desktop is running"

---

## ☐ Step 2: Update Hosts File

**Add subdomain entries for local development:**

```bash
sudo ./ops/scripts/setup-hosts.sh
```

When prompted, type `y` and press Enter.

**Verify it worked:**
```bash
cat /etc/hosts | grep snapback.dev
```

**Expected output:**
```
127.0.0.1 snapback.dev
127.0.0.1 console.snapback.dev
127.0.0.1 docs.snapback.dev
127.0.0.1 api.snapback.dev
127.0.0.1 mcp.snapback.dev
```

**If the script doesn't work, manually add these lines to /etc/hosts:**
```bash
sudo nano /etc/hosts

# Add these lines at the end:
127.0.0.1 snapback.dev
127.0.0.1 console.snapback.dev
127.0.0.1 docs.snapback.dev
127.0.0.1 api.snapback.dev
127.0.0.1 mcp.snapback.dev
```

---

## ☐ Step 3: Configure Environment Variables

**Generate secure passwords:**
```bash
# Generate POSTGRES_PASSWORD (32 chars)
openssl rand -base64 32

# Generate BETTER_AUTH_SECRET (48 chars)
openssl rand -base64 48
```

**Edit .env.docker:**
```bash
nano .env.docker
```

**Update these two values (REQUIRED):**
```bash
# Change from placeholder:
POSTGRES_PASSWORD=your_secure_database_password_here
# To your generated password:
POSTGRES_PASSWORD=<paste-generated-password-here>

# Change from placeholder:
BETTER_AUTH_SECRET=your_super_secure_auth_secret_min_32_chars
# To your generated secret:
BETTER_AUTH_SECRET=<paste-generated-secret-here>
```

**Save and exit:**
- Press `Ctrl+O` to save
- Press `Enter` to confirm
- Press `Ctrl+X` to exit

**Verify your changes:**
```bash
grep -E "^POSTGRES_PASSWORD=|^BETTER_AUTH_SECRET=" .env.docker
```

Should NOT show placeholder values anymore!

---

## ☐ Step 4: Start Docker Services

**Option A: Use startup script (recommended):**
```bash
./ops/scripts/docker-start.sh
```

This will:
- ✅ Validate Docker is running
- ✅ Check environment configuration
- ✅ Verify subdomain setup
- ✅ Build all services
- ✅ Start containers
- ✅ Wait for health checks
- ✅ Display service URLs

**Option B: Manual startup:**
```bash
docker-compose -f docker-compose.dev.yml --env-file .env.docker up -d
```

---

## ☐ Step 5: Verify Services Are Running

**Check all services are up:**
```bash
docker-compose -f docker-compose.dev.yml ps
```

**Expected:** All services should show "Up" status

**If any service is not running:**
```bash
# Check logs for the failing service
docker-compose -f docker-compose.dev.yml logs <service-name>

# Common services: postgres, redis, web, api, docs, mcp
```

---

## ☐ Step 6: Test Accessibility

**Open these URLs in your browser:**

| Service | URL | Expected |
|---------|-----|----------|
| 🌐 Main Site | http://snapback.dev | SnapBack landing page |
| 📱 Console | http://console.snapback.dev | Dashboard/Console |
| 📚 Docs | http://docs.snapback.dev | Documentation |
| 🔌 API Health | http://api.snapback.dev:8080/api/health | `{"status":"healthy"}` |

**If you get errors:**
- DNS errors → Check Step 2 (hosts file)
- 502 Bad Gateway → Check logs: `docker-compose -f docker-compose.dev.yml logs nginx`
- Connection refused → Service not started, check Step 5

---

## ☐ Step 7: Test Database Connection

**Connect to database:**
```bash
docker-compose -f docker-compose.dev.yml exec postgres psql -U snapback -d snapback
```

**Expected:** PostgreSQL prompt `snapback=#`

**Test a query:**
```sql
\dt
```

Should show database tables.

**Exit:**
```sql
\q
```

---

## ☐ Step 8: View Logs (Optional)

**See what's happening:**
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f web
```

Press `Ctrl+C` to exit log view

---

## Troubleshooting

### ❌ Problem: Docker not running
**Solution:** Start Docker Desktop and wait for it to fully start

### ❌ Problem: Port already in use
**Solution:**
```bash
# Find what's using the port
lsof -i :3000  # or :8080, :5432, etc.

# Kill the process
kill -9 <PID>
```

### ❌ Problem: Services keep restarting
**Solution:**
```bash
# Check logs for errors
docker-compose -f docker-compose.dev.yml logs <service-name>

# Rebuild the service
docker-compose -f docker-compose.dev.yml build --no-cache <service-name>
docker-compose -f docker-compose.dev.yml up -d <service-name>
```

### ❌ Problem: Out of disk space
**Solution:**
```bash
# Clean up Docker
docker system prune -a

# Check disk usage
docker system df
```

### ❌ Problem: Environment variables not working
**Solution:**
```bash
# Verify .env.docker has real values (not placeholders)
grep -E "POSTGRES_PASSWORD|BETTER_AUTH_SECRET" .env.docker

# Restart services after editing
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

---

## Complete Reset (Nuclear Option)

If everything is broken, start fresh:

```bash
# Stop and remove everything
docker-compose -f docker-compose.dev.yml down -v

# Remove all SnapBack images
docker images | grep snapback | awk '{print $3}' | xargs docker rmi -f

# Clean Docker system
docker system prune -a

# Start again from Step 4
./ops/scripts/docker-start.sh
```

---

## Success Checklist

Once everything is working, you should have:

- ✅ All services showing "Up" in `docker-compose ps`
- ✅ Can access http://snapback.dev in browser
- ✅ Can access http://console.snapback.dev in browser
- ✅ Can access http://docs.snapback.dev in browser
- ✅ API health check returns `{"status":"healthy"}`
- ✅ Can connect to PostgreSQL database
- ✅ Changes to code reflect automatically (hot reload)

---

## What's Next?

**Development workflow:**
1. Make code changes in your editor
2. Changes auto-reload (web, api, docs)
3. View logs: `docker-compose -f docker-compose.dev.yml logs -f`
4. Test in browser

**Useful commands:**
```bash
# Stop services (keeps data)
docker-compose -f docker-compose.dev.yml down

# Start services
docker-compose -f docker-compose.dev.yml up -d

# Restart a service
docker-compose -f docker-compose.dev.yml restart web

# View all logs
docker-compose -f docker-compose.dev.yml logs -f

# Access container shell
docker-compose -f docker-compose.dev.yml exec web sh
```

**Monitoring:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002 (admin/admin)
- Jaeger: http://localhost:16686
- MailHog: http://localhost:8025

---

## Need Help?

1. Check [DOCKER-TROUBLESHOOTING.md](./DOCKER-TROUBLESHOOTING.md)
2. Run debug script: `./ops/scripts/docker-debug.sh`
3. Save debug output: `./ops/scripts/docker-debug.sh > debug.txt`
4. Create GitHub issue with debug output
