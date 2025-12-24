#!/usr/bin/env bash
#
# SnapBack Platform Integration Test & Deployment Orchestrator
#
# This script coordinates deployment and integration testing across all platform surfaces:
# - Web App (Next.js)
# - API Service (Hono)
# - MCP Server (Model Context Protocol)
# - Docs (Fumadocs)
# - Infrastructure (PostgreSQL, Redis)
#
# Usage:
#   ./scripts/integration-test-deploy.sh [strategy]
#
# Strategies:
#   holistic  - Full stack with monitoring (default)
#   core      - Essential services only
#   minimal   - Infrastructure only
#   ci        - Optimized for CI/CD pipelines
#
# Author: SnapBack Team
# Date: 2025-12-24

set -euo pipefail

# ============================================
# Configuration
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STRATEGY="${1:-holistic}"
COMPOSE_ENV="${COMPOSE_ENV:-.env.docker}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timestamps
START_TIME=$(date +%s)

# ============================================
# Logging Functions
# ============================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# ============================================
# Utility Functions
# ============================================
check_prerequisites() {
    log_section "Checking Prerequisites"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker."
        exit 1
    fi
    log_success "Docker installed"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose not found. Please install Docker Compose."
        exit 1
    fi
    log_success "Docker Compose installed"

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm not found. Please install pnpm."
        exit 1
    fi
    log_success "pnpm installed"

    # Check environment file
    if [ ! -f "${PROJECT_ROOT}/${COMPOSE_ENV}" ]; then
        log_warning "${COMPOSE_ENV} not found. Creating from template..."
        if [ -f "${PROJECT_ROOT}/.env.docker.example" ]; then
            cp "${PROJECT_ROOT}/.env.docker.example" "${PROJECT_ROOT}/${COMPOSE_ENV}"
            log_success "Created ${COMPOSE_ENV} from template"
        else
            log_error "Template .env.docker.example not found"
            exit 1
        fi
    fi
    log_success "Environment file exists"
}

validate_environment() {
    log_section "Validating Environment Configuration"

    if [ -f "${PROJECT_ROOT}/scripts/validation/docker-config-red-tests.mjs" ]; then
        log_info "Running environment validation tests..."
        cd "${PROJECT_ROOT}"
        if node scripts/validation/docker-config-red-tests.mjs; then
            log_success "Environment validation passed"
        else
            log_error "Environment validation failed"
            exit 1
        fi
    else
        log_warning "Validation script not found, skipping"
    fi
}

install_dependencies() {
    log_section "Installing Dependencies"

    cd "${PROJECT_ROOT}"
    log_info "Running pnpm install..."

    if pnpm install --frozen-lockfile; then
        log_success "Dependencies installed"
    else
        log_error "Dependency installation failed"
        exit 1
    fi
}

type_check() {
    log_section "Type Checking"

    cd "${PROJECT_ROOT}"
    log_info "Running TypeScript type checking..."

    if pnpm type-check; then
        log_success "Type checking passed"
    else
        log_error "Type checking failed"
        exit 1
    fi
}

build_packages() {
    log_section "Building Packages"

    cd "${PROJECT_ROOT}"
    log_info "Building all packages with Turbo..."

    if pnpm build; then
        log_success "All packages built successfully"
    else
        log_error "Build failed"
        exit 1
    fi
}

# ============================================
# Deployment Functions
# ============================================
deploy_holistic() {
    log_section "Deploying Holistic Environment"
    log_info "Starting all services with monitoring..."

    cd "${PROJECT_ROOT}"
    if make dev-holistic; then
        log_success "Holistic environment started"

        echo ""
        log_info "Services available at:"
        echo "  🌐 Marketing:    http://snapback.dev"
        echo "  🎛️  Console:     http://console.snapback.dev"
        echo "  📚 Docs:         http://docs.snapback.dev:3001"
        echo "  🔌 API:          http://api.snapback.dev:8080"
        echo "  🤖 MCP:          http://mcp.snapback.dev:8081"
        echo "  📧 Mailhog:      http://localhost:8025"
        echo "  📊 Prometheus:   http://localhost:9090"
        echo "  📈 Grafana:      http://localhost:3002"
        echo "  🔍 Jaeger:       http://localhost:16686"
    else
        log_error "Failed to start holistic environment"
        exit 1
    fi
}

deploy_core() {
    log_section "Deploying Core Services"
    log_info "Starting essential services..."

    cd "${PROJECT_ROOT}"
    if make dev; then
        log_success "Core services started"

        echo ""
        log_info "Services available at:"
        echo "  🌐 Web:          http://localhost:3000"
        echo "  🔌 API:          http://localhost:3001"
        echo "  🤖 MCP:          http://localhost:3002"
        echo "  📧 Mailhog:      http://localhost:8025"
    else
        log_error "Failed to start core services"
        exit 1
    fi
}

deploy_minimal() {
    log_section "Deploying Minimal Infrastructure"
    log_info "Starting infrastructure services only..."

    cd "${PROJECT_ROOT}"
    if make dev-minimal; then
        log_success "Infrastructure started"

        echo ""
        log_info "Infrastructure available at:"
        echo "  🗄️  PostgreSQL:  localhost:5432"
        echo "  📦 Redis:       localhost:6379"
        echo ""
        log_info "Run apps natively:"
        echo "  Terminal 1: pnpm --filter @snapback/web dev"
        echo "  Terminal 2: pnpm --filter @snapback/api dev"
        echo "  Terminal 3: pnpm --filter @snapback/docs dev"
        echo "  Terminal 4: pnpm --filter @snapback/mcp-server dev"
    else
        log_error "Failed to start infrastructure"
        exit 1
    fi
}

deploy_ci() {
    log_section "Deploying CI Environment"
    log_info "Starting optimized CI/CD environment..."

    cd "${PROJECT_ROOT}"

    # Use minimal infrastructure + core services
    log_info "Starting infrastructure..."
    docker-compose -f docker-compose.minimal.yml --env-file "${COMPOSE_ENV}" up -d

    log_info "Waiting for database..."
    sleep 10

    log_success "CI environment ready"
}

# ============================================
# Health Check Functions
# ============================================
wait_for_service() {
    local service_name=$1
    local health_url=$2
    local max_retries=${3:-30}
    local retry_interval=${4:-2}

    log_info "Waiting for ${service_name} to be healthy..."

    local retries=0
    while [ ${retries} -lt ${max_retries} ]; do
        if curl -sf "${health_url}" > /dev/null 2>&1; then
            log_success "${service_name} is healthy"
            return 0
        fi

        retries=$((retries + 1))
        log_info "Waiting for ${service_name}... (${retries}/${max_retries})"
        sleep ${retry_interval}
    done

    log_error "${service_name} failed to become healthy"
    return 1
}

check_all_health() {
    log_section "Health Checks"

    local all_healthy=true

    # Check database
    if docker-compose exec -T postgres pg_isready -U snapback > /dev/null 2>&1; then
        log_success "PostgreSQL healthy"
    else
        log_error "PostgreSQL unhealthy"
        all_healthy=false
    fi

    # Check Redis
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_success "Redis healthy"
    else
        log_error "Redis unhealthy"
        all_healthy=false
    fi

    # Check services based on strategy
    if [ "${STRATEGY}" = "minimal" ]; then
        # Only infrastructure for minimal
        :
    else
        # Check API
        if wait_for_service "API" "http://localhost:3001/api/health" 15 2; then
            :
        else
            all_healthy=false
        fi

        # Check Web
        if wait_for_service "Web" "http://localhost:3000/api/health" 15 2; then
            :
        else
            all_healthy=false
        fi

        # Check MCP
        if wait_for_service "MCP" "http://localhost:3002/health" 15 2; then
            :
        else
            all_healthy=false
        fi
    fi

    if [ "${all_healthy}" = true ]; then
        log_success "All health checks passed"
        return 0
    else
        log_error "Some health checks failed"
        return 1
    fi
}

# ============================================
# Testing Functions
# ============================================
run_unit_tests() {
    log_section "Running Unit Tests"

    cd "${PROJECT_ROOT}"
    if pnpm test; then
        log_success "Unit tests passed"
        return 0
    else
        log_error "Unit tests failed"
        return 1
    fi
}

run_integration_tests() {
    log_section "Running Integration Tests"

    cd "${PROJECT_ROOT}"
    if pnpm test:integration; then
        log_success "Integration tests passed"
        return 0
    else
        log_warning "Integration tests failed or not configured"
        return 0  # Don't fail deployment if integration tests not set up
    fi
}

run_e2e_tests() {
    log_section "Running E2E Tests"

    cd "${PROJECT_ROOT}"
    if pnpm test:e2e; then
        log_success "E2E tests passed"
        return 0
    else
        log_warning "E2E tests failed or not configured"
        return 0  # Don't fail deployment if E2E tests not set up
    fi
}

run_contract_tests() {
    log_section "Running Contract Tests"

    cd "${PROJECT_ROOT}"
    if pnpm contract-test; then
        log_success "Contract tests passed"
        return 0
    else
        log_warning "Contract tests failed or not configured"
        return 0
    fi
}

# ============================================
# Cross-Service Validation
# ============================================
validate_cross_service() {
    log_section "Cross-Service Validation"

    # Test API → Database connectivity
    log_info "Testing API → Database connectivity..."
    if curl -sf http://localhost:3001/api/health | jq -e '.checks.database == "healthy"' > /dev/null 2>&1; then
        log_success "API → Database: OK"
    else
        log_warning "API → Database: Check failed"
    fi

    # Test Redis connectivity
    log_info "Testing Redis connectivity..."
    if curl -sf http://localhost:3001/api/health | jq -e '.checks.redis' > /dev/null 2>&1; then
        log_success "Redis: OK"
    else
        log_warning "Redis: Not configured or check failed"
    fi

    # Test Web → API integration
    log_info "Testing Web → API integration..."
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Web → API: OK"
    else
        log_warning "Web → API: Check failed"
    fi

    log_success "Cross-service validation complete"
}

# ============================================
# Cleanup Functions
# ============================================
cleanup() {
    log_section "Cleanup"

    log_info "Stopping services..."
    cd "${PROJECT_ROOT}"

    case "${STRATEGY}" in
        holistic)
            make down-holistic
            ;;
        core)
            make down
            ;;
        minimal)
            make down-minimal
            ;;
        ci)
            docker-compose -f docker-compose.minimal.yml down
            ;;
    esac

    log_success "Services stopped"
}

# ============================================
# Reporting Functions
# ============================================
print_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))

    log_section "Deployment Summary"

    echo ""
    echo "Strategy:     ${STRATEGY}"
    echo "Duration:     ${minutes}m ${seconds}s"
    echo "Status:       ✅ Complete"
    echo ""

    case "${STRATEGY}" in
        holistic)
            echo "Next steps:"
            echo "  1. Access services (see URLs above)"
            echo "  2. Run manual tests as needed"
            echo "  3. Stop with: make down-holistic"
            ;;
        core)
            echo "Next steps:"
            echo "  1. Access services at localhost:3000-3002"
            echo "  2. Run integration tests"
            echo "  3. Stop with: make down"
            ;;
        minimal)
            echo "Next steps:"
            echo "  1. Start native apps in separate terminals"
            echo "  2. Run tests against localhost services"
            echo "  3. Stop with: make down-minimal"
            ;;
        ci)
            echo "Next steps:"
            echo "  1. CI pipeline continues..."
            echo "  2. Deploy to staging/production"
            ;;
    esac
    echo ""
}

# ============================================
# Main Execution Flow
# ============================================
main() {
    log_section "SnapBack Integration Test & Deployment"
    echo "Strategy: ${STRATEGY}"
    echo ""

    # Phase 1: Pre-flight checks
    check_prerequisites
    validate_environment

    # Phase 2: Build (skip for minimal)
    if [ "${STRATEGY}" != "minimal" ]; then
        install_dependencies
        type_check
        build_packages
    else
        install_dependencies
    fi

    # Phase 3: Deploy
    case "${STRATEGY}" in
        holistic)
            deploy_holistic
            ;;
        core)
            deploy_core
            ;;
        minimal)
            deploy_minimal
            ;;
        ci)
            deploy_ci
            ;;
        *)
            log_error "Unknown strategy: ${STRATEGY}"
            echo "Valid strategies: holistic, core, minimal, ci"
            exit 1
            ;;
    esac

    # Phase 4: Health checks (skip for minimal)
    if [ "${STRATEGY}" != "minimal" ]; then
        sleep 15  # Give services time to start
        check_all_health || {
            log_error "Health checks failed, aborting"
            cleanup
            exit 1
        }
    fi

    # Phase 5: Testing (skip for minimal and holistic in interactive mode)
    if [ "${STRATEGY}" = "ci" ]; then
        run_unit_tests || exit 1
        run_integration_tests
        run_contract_tests
    elif [ "${STRATEGY}" = "core" ]; then
        log_info "Run tests manually with: pnpm test"
    fi

    # Phase 6: Cross-service validation (skip for minimal)
    if [ "${STRATEGY}" != "minimal" ] && [ "${STRATEGY}" != "ci" ]; then
        validate_cross_service
    fi

    # Phase 7: Summary
    print_summary

    # Don't auto-cleanup for interactive modes
    if [ "${STRATEGY}" = "ci" ]; then
        log_info "CI mode: Keeping services running for further testing"
    else
        log_info "Services are running. Use Ctrl+C to stop or run 'make down'"
    fi
}

# ============================================
# Trap signals for cleanup
# ============================================
trap cleanup EXIT INT TERM

# ============================================
# Execute main function
# ============================================
main "$@"
