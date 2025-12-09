# SnapBack Quick Start Guide

## Recommended: Native Development (Fast & Simple)

### 1. Start Infrastructure
```bash
make dev-minimal
# OR
make up
```

This starts only PostgreSQL and Redis in Docker. Your apps run natively for faster reload times.

### 2. Run Apps (in separate terminals)

**Terminal 1 - Web App**:
```bash
pnpm --filter @snapback/web dev
# Access: http://localhost:3000
```

**Terminal 2 - API Server**:
```bash
pnpm --filter @snapback/api dev
# Access: http://localhost:8080
```

**Terminal 3 - Docs** (optional):
```bash
pnpm --filter @snapback/docs dev
# Access: http://localhost:3001
```

**Terminal 4 - MCP Server** (optional):
```bash
pnpm --filter @snapback/mcp-server start:dev
# Access: http://localhost:8081
```

### 3. Stop Infrastructure
```bash
make down-minimal
```

---

## Alternative: Full Docker Setup

⚠️ **Note**: Full Docker setup has monorepo build issues. Use native development instead.

If you still want to try full Docker:
```bash
make dev  # Start all services in Docker
make down # Stop all services
```

---

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
make down-minimal && make dev-minimal
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Clean Docker Volumes
```bash
docker-compose -f docker-compose.minimal.yml down -v
make dev-minimal
```

---

## Development Workflow

1. **Morning**: `make dev-minimal`
2. **Code**: Run apps in separate terminals as needed
3. **Evening**: `make down-minimal` (or leave running)

**Tip**: Use a terminal multiplexer like `tmux` or IDE's split terminal for managing multiple processes.
