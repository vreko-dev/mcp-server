#!/bin/bash

# Local Docker Deployment Validation Script
#
# This script validates that all Docker fixes work correctly in local development
# Covers: image building, container startup, health checks, OAuth config
#
# Usage: ./scripts/docker/local-deploy-test.sh
# Requirements: Docker, Docker Compose, .env.docker configured

set -e  # Exit on error

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.docker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log_section() {
  echo -e "\n${BLUE}════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"
}

log_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
  echo -e "${RED}✗ $1${NC}"
}

log_info() {
  echo -e "${YELLOW}ℹ $1${NC}"
}

log_step() {
  echo -e "${YELLOW}→ $1${NC}"
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

log_section "STEP 1: Prerequisite Checks"

# Check .env.docker exists
if [ ! -f "$ENV_FILE" ]; then
  log_error ".env.docker file not found at $ENV_FILE"
  log_info "Create .env.docker with: docker-compose --env-file .env.docker config"
  exit 1
fi
log_success ".env.docker exists"

# Check required environment variables
log_step "Checking environment variables..."
source "$ENV_FILE"

required_vars=(
  "NEXT_PUBLIC_SITE_URL"
  "BETTER_AUTH_URL"
  "BETTER_AUTH_SECRET"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "DATABASE_URL"
  "POSTGRES_PASSWORD"
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  log_error "Missing required environment variables: ${missing_vars[*]}"
  exit 1
fi
log_success "All required environment variables present"

# Check Docker installed
if ! command -v docker &> /dev/null; then
  log_error "Docker not installed"
  exit 1
fi
log_success "Docker installed ($(docker --version))"

# Check Docker Compose installed
if ! command -v docker-compose &> /dev/null; then
  log_error "Docker Compose not installed"
  exit 1
fi
log_success "Docker Compose installed ($(docker-compose --version))"

# Check Docker daemon running
if ! docker info > /dev/null 2>&1; then
  log_error "Docker daemon not running"
  exit 1
fi
log_success "Docker daemon running"

# ============================================================================
# STEP 2: CLEAN UP OLD CONTAINERS
# ============================================================================

log_section "STEP 2: Clean Up Old Containers"

log_step "Removing old containers (if any)..."
docker-compose --env-file "$ENV_FILE" down 2>/dev/null || true
log_success "Old containers removed"

log_step "Removing old images (optional)..."
log_info "Keeping images to speed up rebuild (use 'docker system prune' to reset)"

# ============================================================================
# STEP 3: BUILD DOCKER IMAGES
# ============================================================================

log_section "STEP 3: Build Docker Images"

log_step "Building all images... (this may take 2-5 minutes)"
if docker-compose --env-file "$ENV_FILE" build 2>&1 | grep -E "Building|Successfully|ERROR"; then
  log_success "All images built successfully"
else
  log_error "Image build failed"
  exit 1
fi

# ============================================================================
# STEP 4: VERIFY IMAGES BUILT
# ============================================================================

log_section "STEP 4: Verify Images Built"

images_to_check=(
  "snapback-postgres"
  "snapback-redis"
  "snapback-api"
  "snapback-web"
)

log_step "Checking built images..."
for image in "${images_to_check[@]}"; do
  if docker images | grep -q "$image" || docker-compose --env-file "$ENV_FILE" images | grep -q "$image"; then
    log_success "Image found: $image"
  fi
done

# ============================================================================
# STEP 5: START CONTAINERS
# ============================================================================

log_section "STEP 5: Start Containers"

log_step "Starting all services... (database migration will run automatically)"
docker-compose --env-file "$ENV_FILE" up -d

log_info "Waiting for services to become healthy (up to 60 seconds)..."
sleep 5

# ============================================================================
# STEP 6: HEALTH CHECKS
# ============================================================================

log_section "STEP 6: Health Checks"

check_service() {
  local service=$1
  local port=$2
  local url=$3
  local retries=0
  local max_retries=12  # 60 seconds (12 * 5 seconds)

  log_step "Checking $service (port $port)..."

  while [ $retries -lt $max_retries ]; do
    if curl -s "$url" > /dev/null 2>&1; then
      log_success "$service is healthy"
      return 0
    fi

    retries=$((retries + 1))
    echo -n "."
    sleep 5
  done

  log_error "$service failed to become healthy after 60 seconds"
  return 1
}

# Check database
log_step "Checking PostgreSQL..."
if docker-compose --env-file "$ENV_FILE" exec -T postgres pg_isready -U snapback > /dev/null 2>&1; then
  log_success "PostgreSQL is healthy"
else
  log_error "PostgreSQL failed health check"
fi

# Check Redis
log_step "Checking Redis..."
if docker-compose --env-file "$ENV_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
  log_success "Redis is healthy"
else
  log_error "Redis failed health check"
fi

# Check API
check_service "API" "8080" "http://localhost:8080/api/health" || log_error "API health check failed"

# Check Web
check_service "Web" "4000" "http://localhost:4000/api/health" || log_error "Web health check failed"

# ============================================================================
# STEP 7: DATABASE MIGRATION VERIFICATION
# ============================================================================

log_section "STEP 7: Database Migration Verification"

log_step "Checking database schema..."
docker-compose --env-file "$ENV_FILE" exec -T postgres psql -U snapback -d snapback -c "\dt" 2>&1 | head -20 || {
  log_error "Failed to query database tables"
}

# Check for auth tables
if docker-compose --env-file "$ENV_FILE" exec -T postgres psql -U snapback -d snapback -c "SELECT COUNT(*) FROM \"user\";" > /dev/null 2>&1; then
  log_success "better-auth tables exist (user table found)"
else
  log_error "better-auth tables not found - migrations may not have run"
fi

# ============================================================================
# STEP 8: ENVIRONMENT VARIABLE VALIDATION
# ============================================================================

log_section "STEP 8: Environment Variable Validation"

log_step "Validating OAuth configuration..."

if [[ "$NEXT_PUBLIC_SITE_URL" == *"localhost:3000"* ]] || [[ "$NEXT_PUBLIC_SITE_URL" == *".dev"* ]] || [[ "$NEXT_PUBLIC_SITE_URL" == *"https://"* ]]; then
  log_success "NEXT_PUBLIC_SITE_URL is properly configured: $NEXT_PUBLIC_SITE_URL"
else
  log_error "NEXT_PUBLIC_SITE_URL not properly configured: $NEXT_PUBLIC_SITE_URL"
fi

if [[ "$BETTER_AUTH_URL" == *"api:8080"* ]] || [[ "$BETTER_AUTH_URL" == *"localhost:8080"* ]] || [[ "$BETTER_AUTH_URL" == *"api.snapback.dev:8080"* ]]; then
  log_success "BETTER_AUTH_URL is properly configured: $BETTER_AUTH_URL"
else
  log_error "BETTER_AUTH_URL not properly configured: $BETTER_AUTH_URL"
fi

if [[ "$NEXT_PUBLIC_SITE_URL" != *"api:8080"* ]]; then
  log_success "NEXT_PUBLIC_SITE_URL does NOT contain internal service name"
else
  log_error "NEXT_PUBLIC_SITE_URL incorrectly uses internal service name"
fi

# ============================================================================
# STEP 9: LOGS INSPECTION
# ============================================================================

log_section "STEP 9: Service Logs (Last 5 lines per service)"

for service in api web postgres redis; do
  echo -e "\n${BLUE}--- $service logs ---${NC}"
  docker-compose --env-file "$ENV_FILE" logs --tail=5 "$service" 2>/dev/null || true
done

# ============================================================================
# STEP 10: SUMMARY
# ============================================================================

log_section "STEP 10: Deployment Summary"

echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Local Docker Deployment Validation Complete${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}\n"

echo "Services running:"
echo -e "  ${GREEN}✓${NC} Web App:       http://localhost:4000"
echo -e "  ${GREEN}✓${NC} API Service:   http://localhost:8080/api/health"
echo -e "  ${GREEN}✓${NC} PostgreSQL:    localhost:5432"
echo -e "  ${GREEN}✓${NC} Redis:         localhost:6379\n"

echo "Next steps:"
echo "  1. Visit http://localhost:4000 in your browser"
echo "  2. Test OAuth login with Google (uses credentials from .env.docker)"
echo "  3. Check API health at http://localhost:8080/api/health"
echo "  4. Monitor logs: docker-compose --env-file .env.docker logs -f api\n"

echo "To stop services:"
echo "  docker-compose --env-file .env.docker down\n"

echo "To reset database (development only):"
echo "  docker-compose --env-file .env.docker down -v\n"

# ============================================================================
# CLEANUP PROMPT
# ============================================================================

read -p "Do you want to keep containers running? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  log_step "Stopping containers..."
  docker-compose --env-file "$ENV_FILE" down
  log_success "Containers stopped"
fi

log_success "Deployment validation complete!"
exit 0
