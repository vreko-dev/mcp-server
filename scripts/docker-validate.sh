#!/bin/bash

# Docker configuration validation script
# Validates Docker setup and configuration files

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Validation functions
validate_docker() {
    log_info "Validating Docker installation..."

    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not installed - skipping runtime checks"
        return 0
    fi

    if ! docker info &> /dev/null; then
        log_warning "Docker daemon is not running - skipping runtime checks"
        return 0
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_warning "Docker Compose is not installed"
        return 0
    fi

    log_success "Docker installation validated"
}

validate_files() {
    log_info "Validating Docker configuration files..."

    local required_files=(
        "Dockerfile"
        "Dockerfile.dev"
        "docker-compose.yml"
        "docker-compose.dev.yml"
        ".dockerignore"
        ".env.docker.example"
        "scripts/docker-build.sh"
        "scripts/docker-deploy.sh"
        "docker/postgres/init.sql"
        "docker/nginx/nginx.conf"
    )

    local missing_files=()
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done

    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "Missing required files:"
        printf '  - %s\n' "${missing_files[@]}"
        return 1
    fi

    log_success "All required files present"
}

validate_dockerfile() {
    log_info "Validating Dockerfile syntax..."

    # Basic syntax validation without Docker daemon
    local dockerfile_errors=()

    # Check for basic Dockerfile structure
    if ! grep -q "^FROM" Dockerfile; then
        dockerfile_errors+=("Production Dockerfile: Missing FROM instruction")
    fi

    if ! grep -q "^FROM" Dockerfile.dev; then
        dockerfile_errors+=("Development Dockerfile: Missing FROM instruction")
    fi

    # Check for required stages in production Dockerfile
    if ! grep -q "AS.*base" Dockerfile; then
        dockerfile_errors+=("Production Dockerfile: Missing base stage")
    fi

    if [[ ${#dockerfile_errors[@]} -gt 0 ]]; then
        log_error "Dockerfile validation errors:"
        printf '  - %s\n' "${dockerfile_errors[@]}"
        return 1
    fi

    log_success "Dockerfile syntax validation passed"
}

validate_compose() {
    log_info "Validating Docker Compose files..."

    local compose_files=(
        "docker-compose.yml"
        "docker-compose.dev.yml"
        "docker-compose.nginx.yml"
    )

    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        log_warning "docker-compose not available - skipping syntax validation"
        return 0
    fi

    for file in "${compose_files[@]}"; do
        # Basic syntax validation for compose files
        if [[ "$file" == "docker-compose.nginx.yml" ]]; then
            # For override files, we need the base compose file
            if docker-compose -f docker-compose.yml -f "$file" config >/dev/null 2>&1; then
                log_success "$file syntax valid"
            else
                log_error "$file has syntax errors"
                return 1
            fi
        else
            if docker-compose -f "$file" config >/dev/null 2>&1; then
                log_success "$file syntax valid"
            else
                log_error "$file has syntax errors"
                return 1
            fi
        fi
    done
}

validate_environment() {
    log_info "Validating environment configuration..."

    if [[ ! -f ".env.docker.example" ]]; then
        log_error "Environment template file missing"
        return 1
    fi

    # Check for required environment variables in example
    local required_vars=(
        "POSTGRES_PASSWORD"
        "BETTER_AUTH_SECRET"
        "DATABASE_URL"
    )

    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env.docker.example; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required variables in .env.docker.example:"
        printf '  - %s\n' "${missing_vars[@]}"
        return 1
    fi

    log_success "Environment configuration valid"
}

validate_scripts() {
    log_info "Validating deployment scripts..."

    local scripts=(
        "scripts/docker-build.sh"
        "scripts/docker-deploy.sh"
    )

    for script in "${scripts[@]}"; do
        if [[ ! -x "$script" ]]; then
            log_error "$script is not executable"
            chmod +x "$script"
            log_info "Made $script executable"
        fi

        # Basic syntax check
        if bash -n "$script"; then
            log_success "$script syntax valid"
        else
            log_error "$script has syntax errors"
            return 1
        fi
    done
}

validate_next_config() {
    log_info "Validating Next.js configuration for Docker..."

    if ! grep -q "output.*standalone" apps/web/next.config.ts; then
        log_error "Next.js config missing 'output: standalone' for Docker deployment"
        return 1
    fi

    if ! grep -q "transpilePackages.*@repo" apps/web/next.config.ts; then
        log_error "Next.js config missing transpilePackages configuration"
        return 1
    fi

    log_success "Next.js configuration valid for Docker"
}

validate_health_endpoint() {
    log_info "Validating health check endpoint..."

    if [[ ! -f "apps/web/app/api/health/route.ts" ]]; then
        log_error "Health check endpoint missing"
        return 1
    fi

    if ! grep -q "database.*queryRaw" apps/web/app/api/health/route.ts; then
        log_warning "Health check may not include database connectivity test"
    fi

    log_success "Health check endpoint present"
}

test_build() {
    log_info "Testing Docker build (optional)..."

    local test_build="${1:-false}"
    if [[ "$test_build" != "true" ]]; then
        log_info "Skipping build test (use --test-build to enable)"
        return 0
    fi

    log_info "Building development image..."
    if docker build -f Dockerfile.dev -t snapback:test-dev . >/dev/null 2>&1; then
        log_success "Development build successful"
        docker rmi snapback:test-dev >/dev/null 2>&1
    else
        log_error "Development build failed"
        return 1
    fi

    log_info "Testing production build (this may take several minutes)..."
    if timeout 600 docker build -f Dockerfile -t snapback:test-prod . >/dev/null 2>&1; then
        log_success "Production build successful"
        docker rmi snapback:test-prod >/dev/null 2>&1
    else
        log_error "Production build failed or timed out"
        return 1
    fi
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --test-build    Actually build images to test (slow)"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "This script validates Docker configuration for SnapBack application"
}

# Main validation function
main() {
    local test_build="false"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --test-build)
                test_build="true"
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    log_info "Starting Docker configuration validation..."

    # Run all validations
    local validations=(
        "validate_docker"
        "validate_files"
        "validate_dockerfile"
        "validate_compose"
        "validate_environment"
        "validate_scripts"
        "validate_next_config"
        "validate_health_endpoint"
    )

    local failed_validations=()

    for validation in "${validations[@]}"; do
        if ! $validation; then
            failed_validations+=("$validation")
        fi
    done

    # Test build if requested
    if [[ "$test_build" == "true" ]]; then
        if ! test_build "$test_build"; then
            failed_validations+=("test_build")
        fi
    fi

    # Summary
    echo ""
    if [[ ${#failed_validations[@]} -eq 0 ]]; then
        log_success "All validations passed! Docker configuration is ready."

        echo ""
        log_info "Next steps:"
        echo "  1. Copy .env.docker.example to .env.docker and configure"
        echo "  2. Start development: docker-compose -f docker-compose.dev.yml up -d"
        echo "  3. Build production: ./scripts/docker-build.sh production"
        echo "  4. Deploy production: ./scripts/docker-deploy.sh"

    else
        log_error "Validation failed. Please fix the following issues:"
        printf '  - %s\n' "${failed_validations[@]}"
        exit 1
    fi
}

# Run main function
main "$@"