.PHONY: help install dev up down logs clean test test-e2e db-migrate db-seed rebuild
.DELETE_ON_ERROR:

# ============================================
# Configuration Variables
# ============================================
DOCKER_ENV := --env-file .env.docker
COMPOSE_DEV := docker-compose $(DOCKER_ENV) -f docker-compose.dev.yml
COMPOSE_HOLISTIC := docker-compose $(DOCKER_ENV) -f docker-compose.holistic.yml
COMPOSE_MINIMAL := docker-compose $(DOCKER_ENV) -f docker-compose.minimal.yml
COMPOSE_LOCAL := docker-compose -f docker-compose.dev-local.yml

# ============================================
# Private targets for prerequisites
# ============================================
_check-docker:
	@command -v docker >/dev/null || { echo "❌ Docker not found. Please install Docker."; exit 1; }
	@command -v docker-compose >/dev/null || { echo "❌ Docker Compose not found. Please install Docker Compose."; exit 1; }
	@command -v pnpm >/dev/null || { echo "❌ pnpm not found. Please install pnpm."; exit 1; }

_validate-env:
	@[ -f .env.docker ] || { echo "⚠️  .env.docker not found. Creating from template..."; cp .env.docker.example .env.docker 2>/dev/null || { echo "❌ Template not found. Run: cp .env.docker.example .env.docker"; exit 1; }; }

_validate-compose:
	@[ -f docker-compose.dev.yml ] || { echo "❌ docker-compose.dev.yml not found"; exit 1; }
	@[ -f docker-compose.holistic.yml ] || { echo "❌ docker-compose.holistic.yml not found"; exit 1; }

_health-check-dev:
	@echo "🔍 Checking API health..."
	@curl -sf http://api.snapback.dev:8080/api/health > /dev/null 2>&1 && echo "✅ API healthy" || { echo "❌ API health check failed"; exit 1; }

_health-check-holistic:
	@echo "🔍 Checking services health..."
	@curl -sf http://api.snapback.dev:8080/api/health > /dev/null 2>&1 && echo "✅ API healthy" || { echo "⚠️  API not yet healthy"; }

# ============================================
# Help target
# ============================================
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

install: _validate-env ## Install all dependencies
	pnpm install

dev-minimal: _check-docker _validate-env _validate-compose ## Start only infrastructure (PostgreSQL + Redis) for native app development
	$(COMPOSE_MINIMAL) up -d || { echo "❌ Failed to start minimal services"; exit 1; }
	@echo ""
	@echo "✅ Infrastructure running!"
	@echo ""
	@echo "📍 Services available:"
	@echo "  🗄️  PostgreSQL:  localhost:5432"
	@echo "  📦 Redis:       localhost:6379"
	@echo ""
	@echo "🚀 Run apps natively:"
	@echo "  Terminal 1: pnpm --filter @snapback/web dev"
	@echo "  Terminal 2: pnpm --filter @snapback/api dev"
	@echo "  Terminal 3: pnpm --filter @snapback/docs dev"
	@echo "  Terminal 4: pnpm --filter @snapback/mcp-server start:dev"
	@echo ""
	@echo "🛑 Stop infrastructure:"
	@echo "  make down-minimal"
	@echo ""

dev: _check-docker _validate-env _validate-compose ## Start all services with hot-reload (Docker)
	$(COMPOSE_DEV) up -d || { echo "❌ Failed to start services"; exit 1; }
	@sleep 2
	@$(MAKE) _health-check-dev || { $(COMPOSE_DEV) down && exit 1; }
	@echo ""
	@echo "✅ All services running!"
	@echo ""
	@echo "📍 Access your apps:"
	@echo "  🌐 Marketing:   http://snapback.dev"
	@echo "  🎛️  Console:     http://console.snapback.dev"
	@echo "  📚 Docs:        http://docs.snapback.dev"
	@echo "  🔌 API:         http://api.snapback.dev"
	@echo "  🤖 MCP:         http://mcp.snapback.dev"
	@echo "  📧 Mailhog:     http://localhost:8025"
	@echo ""
	@echo "📊 View logs:"
	@echo "  make logs           # All services"
	@echo "  make logs-web       # Web only"
	@echo "  make logs-api       # API only"
	@echo ""
	@echo "🛑 Stop everything:"
	@echo "  make down"
	@echo ""

dev-holistic: _check-docker _validate-env _validate-compose ## Start ALL services holistically for comprehensive debugging (includes CLI, monitoring, tracing)
	$(COMPOSE_HOLISTIC) up -d || { echo "❌ Failed to start holistic services"; exit 1; }
	@sleep 2
	@$(MAKE) _health-check-holistic
	@echo ""
	@echo "✅ Holistic development environment launched!"
	@echo ""
	@echo "📍 Access your apps:"
	@echo "  🌐 Marketing:    http://snapback.dev"
	@echo "  🎛️  Console:      http://console.snapback.dev"
	@echo "  📚 Docs:         http://docs.snapback.dev:3001"
	@echo "  🔌 API:          http://api.snapback.dev:8080"
	@echo "  🤖 MCP:          http://mcp.snapback.dev:8081"
	@echo ""
	@echo "📧 Email Testing:"
	@echo "  Mailhog:         http://localhost:8025"
	@echo ""
	@echo "📊 Monitoring & Debugging:"
	@echo "  Prometheus:      http://localhost:9090"
	@echo "  Grafana:         http://localhost:3002 (admin/admin)"
	@echo "  Jaeger:          http://localhost:16686"
	@echo "  Redis Insight:   http://localhost:8001"
	@echo ""
	@echo "💻 Database & Cache:"
	@echo "  PostgreSQL:      localhost:5432"
	@echo "  Redis:           localhost:6379"
	@echo ""
	@echo "🔧 Node.js Debuggers:"
	@echo "  API:             chrome://inspect → Target: localhost:9230"
	@echo "  MCP:             chrome://inspect → Target: localhost:9231"
	@echo "  Web:             chrome://inspect → Target: localhost:9229"
	@echo "  Docs:            chrome://inspect → Target: localhost:9232"
	@echo "  CLI:             chrome://inspect → Target: localhost:9233"
	@echo ""
	@echo "📊 View logs:"
	@echo "  make logs-holistic           # All services"
	@echo "  make logs-holistic-api       # API only"
	@echo "  make logs-holistic-web       # Web only"
	@echo "  make logs-holistic-mcp       # MCP only"
	@echo "  make logs-holistic-cli       # CLI only"
	@echo ""
	@echo "🛑 Stop everything:"
	@echo "  make down-holistic"
	@echo ""

dev-docker: _check-docker _validate-env ## Start minimal dev environment with build tools for better-sqlite3
	$(COMPOSE_LOCAL) run --rm dev
	@echo ""
	@echo "ℹ️  Dev container exited. To rebuild the image:"
	@echo "  docker-compose -f docker-compose.dev-local.yml build --no-cache"
	@echo ""

cli-shell: _check-docker _validate-env ## Interactive shell into CLI service for development
	$(COMPOSE_HOLISTIC) exec cli bash

up: dev-minimal ## Alias for 'make dev-minimal' (recommended for local development)

down: _check-docker _validate-env ## Stop all services
	$(COMPOSE_DEV) down

down-holistic: _check-docker _validate-env ## Stop holistic development environment
	$(COMPOSE_HOLISTIC) down

down-minimal: _check-docker _validate-env ## Stop infrastructure services
	$(COMPOSE_MINIMAL) down

# ============================================
# Logging targets (dev setup)
# ============================================
logs: ## View logs from all services (dev setup)
	$(COMPOSE_DEV) logs -f

logs-%: ## View service logs - make logs-web, logs-api, logs-mcp, logs-db, logs-migrations, logs-docs
	$(COMPOSE_DEV) logs -f $*

# ============================================
# Logging targets (holistic setup)
# ============================================
logs-holistic: ## View all logs (holistic setup)
	$(COMPOSE_HOLISTIC) logs -f

logs-holistic-%: ## View holistic service logs - make logs-holistic-api, logs-holistic-web, logs-holistic-mcp, etc
	$(COMPOSE_HOLISTIC) logs -f $*

# ============================================
# Service restart targets
# ============================================
restart-%: ## Restart services in dev setup - make restart-web, restart-api, restart-mcp
	$(COMPOSE_DEV) restart $*

restart-services: ## Restart web, api, mcp in parallel (dev setup)
	$(COMPOSE_DEV) restart web api mcp

restart-holistic-%: ## Restart services in holistic setup - make restart-holistic-api, restart-holistic-web, etc
	$(COMPOSE_HOLISTIC) restart $*

restart-services-holistic: ## Restart api, web, mcp, cli, docs in parallel (holistic setup)
	$(COMPOSE_HOLISTIC) restart api web mcp cli docs

clean: _check-docker ## Remove all containers, volumes, and images (⚠️ DESTRUCTIVE - Requires confirmation)
	@echo "⚠️  WARNING: This will delete ALL SnapBack services, volumes, images, and system data"
	@read -p "Type 'yes' to continue: " confirm; [ "$$confirm" = "yes" ] || { echo "Cancelled"; exit 1; }
	$(COMPOSE_DEV) down -v --rmi all
	docker system prune -f
	@echo "✅ Cleanup complete"

rebuild: _check-docker _validate-env ## Rebuild all services (no cache)
	$(COMPOSE_DEV) build --no-cache || { echo "❌ Build failed"; exit 1; }
	$(MAKE) dev

test: _check-docker ## Run unit tests
	pnpm test -- --coverage

test-e2e: _check-docker _validate-env ## Run E2E tests (Playwright)
	pnpm test:e2e || { echo "❌ E2E tests failed"; exit 1; }

test-e2e-ui: _check-docker ## Run E2E tests with UI
	pnpm test:e2e:ui

db-migrate: _check-docker _validate-env ## Run database migrations (⚠️ Requires confirmation)
	@echo "⚠️  This will run database migrations and modify your schema"
	@read -p "Type 'yes' to continue: " confirm; [ "$$confirm" = "yes" ] || { echo "Cancelled"; exit 1; }
	$(COMPOSE_DEV) exec -T postgres psql -U snapback -d snapback -f /docker-entrypoint-initdb.d/001_initial_schema.sql || { echo "❌ Migration failed"; exit 1; }
	@echo "✅ Migrations complete"

db-seed: _check-docker ## Seed database with test data (safe, idempotent)
	pnpm --filter @snapback/platform seed || { echo "❌ Seed failed"; exit 1; }

db-reset: _check-docker _validate-env ## Reset database (drop + recreate) (⚠️ DESTRUCTIVE)
	@echo "⚠️  This will DELETE all database data"
	@read -p "Type 'yes' to continue: " confirm; [ "$$confirm" = "yes" ] || { echo "Cancelled"; exit 1; }
	$(COMPOSE_DEV) down postgres -v
	$(COMPOSE_DEV) up -d postgres
	sleep 5
	$(MAKE) db-migrate
	$(MAKE) db-seed
	@echo "✅ Database reset complete"

# ============================================
# Shell access targets
# ============================================
shell-web: _check-docker _validate-env ## Shell into web container
	$(COMPOSE_DEV) exec web sh

shell-api: _check-docker _validate-env ## Shell into API container
	$(COMPOSE_DEV) exec api sh

shell-db: _check-docker _validate-env ## Shell into database
	$(COMPOSE_DEV) exec postgres psql -U snapback -d snapback

health: ## Check health of all services
	@echo "🔍 Checking service health..."
	@curl -s http://api.snapback.dev:8080/api/health | jq . || echo "❌ API unhealthy"
	@curl -s http://mcp.snapback.dev:8081/health | jq . || echo "❌ MCP unhealthy"
	@curl -s http://snapback.dev > /dev/null 2>&1 && echo "✅ Web healthy" || echo "❌ Web unhealthy"
	@curl -s http://console.snapback.dev > /dev/null 2>&1 && echo "✅ Console healthy" || echo "❌ Console unhealthy"
	@curl -s http://docs.snapback.dev:3001 > /dev/null 2>&1 && echo "✅ Docs healthy" || echo "❌ Docs unhealthy"

# ============================================
# Status and utility targets
# ============================================
status: _check-docker _validate-env ## Show status of all containers
	@echo "📊 Container Status (dev setup):"
	@$(COMPOSE_DEV) ps

status-holistic: _check-docker _validate-env ## Show status of holistic containers
	@echo "📊 Container Status (holistic setup):"
	@$(COMPOSE_HOLISTIC) ps

.PHONY: help install dev dev-minimal dev-holistic dev-docker up down down-holistic down-minimal logs logs-% \
        logs-holistic logs-holistic-% restart-% restart-services restart-holistic-% restart-services-holistic \
        cli-shell clean rebuild test test-e2e test-e2e-ui db-migrate db-seed db-reset shell-web shell-api \
        shell-db health status status-holistic _check-docker _validate-env _validate-compose _health-check-dev _health-check-holistic
