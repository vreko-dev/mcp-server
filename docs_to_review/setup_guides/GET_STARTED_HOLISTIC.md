# 🚀 Get Started with Holistic Docker (2 minutes)

## Step 1: Setup Environment (30 seconds)

```bash
# Copy example and customize
cp .env.docker.example .env.docker.local

# Edit the file (required fields)
# POSTGRES_PASSWORD=your_secure_password
# BETTER_AUTH_SECRET=minimum_32_characters_long
```

**TIP**: Generate secure values:
```bash
# For password
openssl rand -base64 32

# For secret
openssl rand -base64 48
```

## Step 2: Launch Everything (10 seconds)

```bash
make dev-holistic
```

Wait 30-60 seconds for services to start...

## Step 3: Access Services

Once you see ✅ messages, open:

| App | URL |
|-----|-----|
| Marketing | http://snapback.dev:3000 |
| Console | http://console.snapback.dev:3000 |
| Docs | http://docs.snapback.dev:3001 |
| API | http://api.snapback.dev:8080 |
| MCP | http://mcp.snapback.dev:8081 |
| **Grafana** (metrics) | http://localhost:3002 |
| **Jaeger** (tracing) | http://localhost:16686 |

## View Logs

```bash
# All services
make logs-holistic

# Specific service
make logs-holistic-api
make logs-holistic-web
make logs-holistic-mcp
```

## Stop Everything

```bash
make down-holistic
```

---

## Common Tasks

### Attach Node.js Debugger

1. Open `chrome://inspect` in Chrome
2. Look for "api", "web", "mcp", etc.
3. Click "inspect"
4. Set breakpoints and debug!

### Run CLI Commands

```bash
make cli-shell
# Now inside container:
pnpm test
pnpm build
pnpm dev
```

### Access Database

```bash
docker-compose -f docker-compose.holistic.yml exec postgres psql -U snapback -d snapback
# Now you can run SQL:
SELECT * FROM users;
```

### View Metrics

1. Open http://localhost:3002 (Grafana)
2. Login: admin / admin
3. Explore dashboards

### Check Service Health

```bash
docker-compose -f docker-compose.holistic.yml ps
```

Should show all services as "healthy" ✅

---

## Troubleshooting

### Services Not Starting?

```bash
# Check logs
make logs-holistic

# Rebuild without cache
docker-compose -f docker-compose.holistic.yml build --no-cache
docker-compose -f docker-compose.holistic.yml up -d
```

### Database Issues?

```bash
# Reset database (WARNING: deletes data)
docker-compose -f docker-compose.holistic.yml down postgres -v
docker-compose -f docker-compose.holistic.yml up -d
```

### Port Already in Use?

```bash
# Find process
lsof -i :3000  # or :8080, :8081, etc.

# Kill it
kill -9 <PID>
```

---

## What's Running?

✅ **Web Apps**: Marketing site, Console, Docs
✅ **APIs**: Hono API server, MCP Server
✅ **CLI**: Command-line tool
✅ **Database**: PostgreSQL
✅ **Cache**: Redis
✅ **Email**: Mailhog (testing)
✅ **Monitoring**: Prometheus, Grafana, Jaeger
✅ **Debugging**: Node.js debuggers on ports 9229-9233

## Next Steps

- 📖 Read [DOCKER_QUICK_REFERENCE.md](./DOCKER_QUICK_REFERENCE.md) for more commands
- 📚 Read [docs/HOLISTIC_DOCKER_SETUP.md](./docs/HOLISTIC_DOCKER_SETUP.md) for advanced usage
- 🐛 Use Chrome `chrome://inspect` to debug Node.js services
- 📊 Open Grafana at http://localhost:3002 to view metrics

## Pro Tips

💡 Use `make help | grep holistic` to see all available commands

💡 Services auto-reload on code changes (hot reload enabled)

💡 Each service has its own logs: `make logs-holistic-<service>`

💡 Restart just one service: `make restart-holistic-<service>`

💡 Stop everything but keep data: `make down-holistic`

---

**You're all set! Happy debugging! 🎉**
