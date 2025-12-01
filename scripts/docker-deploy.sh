#!/bin/bash

# Docker deployment script for SnapBack application
# Handles environment setup, deployment, and health checks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="${1:-docker-compose.yml}"
ENVIRONMENT="${2:-production}"
PROJECT_NAME="${PROJECT_NAME:-snapback}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup_on_error() {
    log_error "Deployment failed. Cleaning up..."
    docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" down --remove-orphans 2>/dev/null || true
    exit 1
}

check_dependencies() {
    log_info "Checking deployment dependencies..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    # Check if compose file exists
    if [[ ! -f "${COMPOSE_FILE}" ]]; then
        log_error "Compose file not found: ${COMPOSE_FILE}"
        exit 1
    fi

    log_success "Dependencies check passed"
}

validate_environment() {
    log_info "Validating environment configuration..."

    local required_vars=()

    if [[ "${ENVIRONMENT}" == "production" ]]; then
        required_vars=(
            "POSTGRES_PASSWORD"
            "BETTER_AUTH_SECRET"
            "BETTER_AUTH_URL"
        )
    else
        required_vars=(
            "POSTGRES_PASSWORD"
        )
    fi

    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        printf '  - %s\n' "${missing_vars[@]}"
        log_error "Please set these variables in your .env file or environment"
        exit 1
    fi

    log_success "Environment validation passed"
}

backup_data() {
    if [[ "${ENVIRONMENT}" == "production" ]]; then
        log_info "Creating backup before deployment..."

        local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "${backup_dir}"

        # Backup database if running
        if docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" ps postgres | grep -q "Up"; then
            log_info "Backing up database..."
            docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" exec -T postgres \
                pg_dump -U "${POSTGRES_USER:-snapback}" "${POSTGRES_DB:-snapback}" | \
                gzip > "${backup_dir}/database.sql.gz"
            log_success "Database backup created: ${backup_dir}/database.sql.gz"
        fi

        # Backup uploaded files if volume exists
        if docker volume ls | grep -q "${PROJECT_NAME}_uploads"; then
            log_info "Backing up uploaded files..."
            docker run --rm -v "${PROJECT_NAME}_uploads:/data" -v "$PWD/${backup_dir}:/backup" \
                alpine tar czf /backup/uploads.tar.gz /data
            log_success "Files backup created: ${backup_dir}/uploads.tar.gz"
        fi
    fi
}

deploy_services() {
    log_info "Deploying services..."

    # Pull latest images
    log_info "Pulling latest images..."
    docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" pull

    # Start services with rolling update
    log_info "Starting services..."
    docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" up -d --remove-orphans

    log_success "Services deployment completed"
}

run_migrations() {
    log_info "Running database migrations..."

    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    local retries=0
    local max_retries=30

    while ! docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" exec -T postgres \
          pg_isready -U "${POSTGRES_USER:-snapback}" -d "${POSTGRES_DB:-snapback}" >/dev/null 2>&1; do

        retries=$((retries + 1))
        if [[ ${retries} -gt ${max_retries} ]]; then
            log_error "Database failed to start within expected time"
            return 1
        fi

        log_info "Waiting for database... (${retries}/${max_retries})"
        sleep 2
    done

    # Run Prisma migrations
    log_info "Applying Prisma migrations..."
    docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" exec web \
        sh -c "cd /app && pnpm --filter database run generate && pnpm --filter database run push"

    log_success "Database migrations completed"
}

health_check() {
    log_info "Performing health checks..."

    local services=("web" "postgres")
    if grep -q "redis:" "${COMPOSE_FILE}"; then
        services+=("redis")
    fi

    for service in "${services[@]}"; do
        log_info "Checking health of ${service}..."

        local retries=0
        local max_retries=$((HEALTH_CHECK_TIMEOUT / 10))

        while ! docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" ps "${service}" | grep -q "healthy\|Up"; do
            retries=$((retries + 1))
            if [[ ${retries} -gt ${max_retries} ]]; then
                log_error "Service ${service} failed health check"
                docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" logs "${service}"
                return 1
            fi

            log_info "Waiting for ${service} to be healthy... (${retries}/${max_retries})"
            sleep 10
        done

        log_success "Service ${service} is healthy"
    done

    # Test web application endpoint
    if [[ "${ENVIRONMENT}" == "production" ]]; then
        local web_url="${BETTER_AUTH_URL:-http://localhost:3000}"
        log_info "Testing web application at ${web_url}..."

        if curl -f -s "${web_url}/api/health" >/dev/null; then
            log_success "Web application is responding"
        else
            log_error "Web application health check failed"
            return 1
        fi
    fi

    log_success "All health checks passed"
}

show_status() {
    log_info "Deployment status:"
    echo ""
    docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" ps
    echo ""

    log_info "Resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
}

rollback() {
    log_warning "Rolling back deployment..."

    # Stop current services
    docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" down

    # Restore from backup if available
    local latest_backup=$(find backups -maxdepth 1 -type d -name "20*" | sort -r | head -n1)
    if [[ -n "${latest_backup}" ]] && [[ -f "${latest_backup}/database.sql.gz" ]]; then
        log_info "Restoring database from ${latest_backup}..."
        docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" up -d postgres
        sleep 10
        zcat "${latest_backup}/database.sql.gz" | \
            docker-compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" exec -T postgres \
            psql -U "${POSTGRES_USER:-snapback}" -d "${POSTGRES_DB:-snapback}"
        log_success "Database restored"
    fi

    log_success "Rollback completed"
}

show_usage() {
    echo "Usage: $0 [COMPOSE_FILE] [ENVIRONMENT]"
    echo ""
    echo "COMPOSE_FILE:"
    echo "  Path to docker-compose file (default: docker-compose.yml)"
    echo ""
    echo "ENVIRONMENT:"
    echo "  production    Production deployment with full checks"
    echo "  development   Development deployment"
    echo "  staging       Staging deployment"
    echo ""
    echo "Environment variables:"
    echo "  PROJECT_NAME              Docker Compose project name (default: snapback)"
    echo "  HEALTH_CHECK_TIMEOUT      Health check timeout in seconds (default: 300)"
    echo ""
    echo "Required environment variables for production:"
    echo "  POSTGRES_PASSWORD         Database password"
    echo "  BETTER_AUTH_SECRET        Auth secret key"
    echo "  BETTER_AUTH_URL          Application URL"
    echo ""
    echo "Commands:"
    echo "  $0                        # Deploy with production settings"
    echo "  $0 docker-compose.dev.yml development  # Deploy development"
    echo ""
    echo "Special commands:"
    echo "  $0 rollback              # Rollback to previous deployment"
    echo "  $0 status                # Show current deployment status"
}

# Main execution
main() {
    # Handle special commands
    case "${1:-}" in
        "-h"|"--help")
            show_usage
            exit 0
            ;;
        "rollback")
            rollback
            exit 0
            ;;
        "status")
            show_status
            exit 0
            ;;
    esac

    log_info "Starting deployment process..."
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Compose file: ${COMPOSE_FILE}"
    log_info "Project: ${PROJECT_NAME}"

    check_dependencies
    validate_environment

    # Only backup in production
    if [[ "${ENVIRONMENT}" == "production" ]]; then
        backup_data
    fi

    deploy_services
    run_migrations
    health_check
    show_status

    log_success "Deployment completed successfully!"

    if [[ "${ENVIRONMENT}" == "production" ]]; then
        log_info "Application is running at: ${BETTER_AUTH_URL:-http://localhost:3000}"
    else
        log_info "Application is running at: http://localhost:${WEB_PORT:-3000}"
    fi
}

# Trap cleanup on error
trap cleanup_on_error ERR

# Run main function
main "$@"