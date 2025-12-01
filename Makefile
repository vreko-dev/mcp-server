.PHONY: help install dev up down logs clean test test-e2e db-migrate db-seed rebuild

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	pnpm install

dev-minimal: ## Start only infrastructure (PostgreSQL + Redis) for native app development
	docker-compose --env-file .env.docker -f docker-compose.minimal.yml up -d
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

dev: ## Start all services with hot-reload (Docker)
	docker-compose --env-file .env.docker -f docker-compose.dev.yml up -d
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

dev-docker: ## Start minimal dev environment with build tools for better-sqlite3
	docker-compose -f docker-compose.dev-local.yml run --rm dev
	@echo ""
	@echo "ℹ️  Dev container exited. To rebuild the image:"
	@echo "  docker-compose -f docker-compose.dev-local.yml build --no-cache"
	@echo ""

up: dev-minimal ## Alias for 'make dev-minimal' (recommended for local development)

down: ## Stop all services
	docker-compose --env-file .env.docker -f docker-compose.dev.yml down

down-minimal: ## Stop infrastructure services
	docker-compose --env-file .env.docker -f docker-compose.minimal.yml down

logs: ## View logs from all services
	docker-compose -f docker-compose.dev.yml logs -f

logs-web: ## View web app logs
	docker-compose -f docker-compose.dev.yml logs -f web

logs-docs: ## View docs app logs
	docker-compose -f docker-compose.dev.yml logs -f docs

logs-api: ## View API logs
	docker-compose -f docker-compose.dev.yml logs -f api

logs-mcp: ## View MCP logs
	docker-compose -f docker-compose.dev.yml logs -f mcp

logs-db: ## View database logs
	docker-compose -f docker-compose.dev.yml logs -f postgres

logs-migrations: ## View migrations logs
	docker-compose -f docker-compose.dev.yml logs -f migrations

restart-web: ## Restart web service
	docker-compose -f docker-compose.dev.yml restart web

restart-api: ## Restart API service
	docker-compose -f docker-compose.dev.yml restart api

restart-mcp: ## Restart MCP service
	docker-compose -f docker-compose.dev.yml restart mcp

clean: ## Remove all containers, volumes, and images
	docker-compose --env-file .env.docker -f docker-compose.dev.yml down -v --rmi all
	docker system prune -f

rebuild: ## Rebuild all services (no cache)
	docker-compose --env-file .env.docker -f docker-compose.dev.yml build --no-cache
	make dev

test: ## Run unit tests
	pnpm test

test-e2e: ## Run E2E tests (Playwright)
	pnpm test:e2e

test-e2e-ui: ## Run E2E tests with UI
	pnpm test:e2e:ui

db-migrate: ## Run database migrations
	docker-compose --env-file .env.docker -f docker-compose.dev.yml exec -T postgres psql -U snapback -d snapback -f /docker-entrypoint-initdb.d/001_initial_schema.sql

db-seed: ## Seed database with test data
	pnpm --filter @snapback/platform seed

db-reset: ## Reset database (drop + recreate)
	docker-compose --env-file .env.docker -f docker-compose.dev.yml down postgres -v
	docker-compose --env-file .env.docker -f docker-compose.dev.yml up -d postgres
	sleep 5
	make db-migrate
	make db-seed

shell-web: ## Shell into web container
	docker-compose -f docker-compose.dev.yml exec web sh

shell-api: ## Shell into API container
	docker-compose -f docker-compose.dev.yml exec api sh

shell-db: ## Shell into database
	docker-compose -f docker-compose.dev.yml exec postgres psql -U snapback -d snapback

health: ## Check health of all services
	@echo "Checking service health..."
	@curl -s http://api.snapback.dev:8080/api/health | jq . || echo "❌ API unhealthy"
	@curl -s http://mcp.snapback.dev:8081/health | jq . || echo "❌ MCP unhealthy"
	@curl -s http://snapback.dev | grep -q "SnapBack" && echo "✅ Web healthy" || echo "❌ Web unhealthy"
	@curl -s http://console.snapback.dev | grep -q "Console" && echo "✅ Console healthy" || echo "❌ Console unhealthy"
	@curl -s http://docs.snapback.dev | grep -q "Documentation" && echo "✅ Docs healthy" || echo "❌ Docs unhealthy"
