#!/bin/bash

# SnapBack Docker - Startup Script
# Launches all Docker services with proper validation and health checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"
ENV_FILE="${ENV_FILE:-.env.docker}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo -e "${BLUE}🐳 SnapBack Docker Startup${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Navigate to project directory
cd "$PROJECT_DIR"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ Compose file not found: $COMPOSE_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Compose file found: $COMPOSE_FILE${NC}"

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file not found: $ENV_FILE${NC}"
    echo -e "${YELLOW}💡 Creating from example...${NC}"

    if [ -f "$ENV_FILE.example" ]; then
        cp "$ENV_FILE.example" "$ENV_FILE"
        echo -e "${GREEN}✅ Created $ENV_FILE from example${NC}"
        echo -e "${YELLOW}⚠️  Please edit $ENV_FILE and set your configuration values${NC}"
        echo -e "${YELLOW}   At minimum, set POSTGRES_PASSWORD and BETTER_AUTH_SECRET${NC}"
        echo ""
        read -p "Press Enter to continue after editing $ENV_FILE..."
    else
        echo -e "${RED}❌ Example file not found: $ENV_FILE.example${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ Environment file found: $ENV_FILE${NC}"

# Validate critical environment variables
echo ""
echo -e "${BLUE}🔍 Validating environment configuration...${NC}"

# Source the env file
set -a
source "$ENV_FILE"
set +a

VALIDATION_FAILED=0

# Check POSTGRES_PASSWORD
if [ "$POSTGRES_PASSWORD" = "your_secure_database_password_here" ] || [ -z "$POSTGRES_PASSWORD" ]; then
    echo -e "${RED}❌ POSTGRES_PASSWORD is not set or using default value${NC}"
    VALIDATION_FAILED=1
else
    echo -e "${GREEN}✅ POSTGRES_PASSWORD is set${NC}"
fi

# Check BETTER_AUTH_SECRET
if [ "$BETTER_AUTH_SECRET" = "your_super_secure_auth_secret_min_32_chars" ] || [ -z "$BETTER_AUTH_SECRET" ]; then
    echo -e "${RED}❌ BETTER_AUTH_SECRET is not set or using default value${NC}"
    VALIDATION_FAILED=1
else
    if [ ${#BETTER_AUTH_SECRET} -lt 32 ]; then
        echo -e "${RED}❌ BETTER_AUTH_SECRET must be at least 32 characters${NC}"
        VALIDATION_FAILED=1
    else
        echo -e "${GREEN}✅ BETTER_AUTH_SECRET is set${NC}"
    fi
fi

if [ $VALIDATION_FAILED -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Environment validation failed!${NC}"
    echo -e "${YELLOW}💡 Please edit $ENV_FILE and set the required values${NC}"
    exit 1
fi

# Check subdomain configuration in /etc/hosts
echo ""
echo -e "${BLUE}🌐 Checking subdomain configuration...${NC}"

HOSTS_OK=1
REQUIRED_HOSTS=("snapback.dev" "console.snapback.dev" "docs.snapback.dev" "api.snapback.dev" "mcp.snapback.dev")

for host in "${REQUIRED_HOSTS[@]}"; do
    if ! grep -q "127.0.0.1.*$host" /etc/hosts; then
        echo -e "${RED}❌ Missing: $host${NC}"
        HOSTS_OK=0
    fi
done

if [ $HOSTS_OK -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some subdomains are not configured in /etc/hosts${NC}"
    echo -e "${YELLOW}💡 Run: sudo ops/scripts/setup-hosts.sh${NC}"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ All subdomains configured${NC}"
fi

# Stop any running containers
echo ""
echo -e "${BLUE}🛑 Stopping any running containers...${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down 2>/dev/null || true

# Pull latest images
echo ""
echo -e "${BLUE}📥 Pulling latest base images...${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull postgres redis --quiet

# Build services
echo ""
echo -e "${BLUE}🏗️  Building services...${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

# Start services
echo ""
echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# Wait for services to be healthy
echo ""
echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"

# Function to check service health
check_health() {
    local service=$1
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps "$service" | grep -q "healthy\|running"; then
            echo -e "${GREEN}✅ $service is healthy${NC}"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -e "${YELLOW}⏳ Waiting for $service... ($attempt/$max_attempts)${NC}"
        sleep 2
    done

    echo -e "${RED}❌ $service failed to start${NC}"
    return 1
}

# Check critical services
HEALTH_CHECK_FAILED=0

check_health "postgres" || HEALTH_CHECK_FAILED=1
check_health "redis" || HEALTH_CHECK_FAILED=1

# Give app services more time to start
sleep 5

# Check application services (they might not have health checks)
echo ""
echo -e "${BLUE}🔍 Checking application services...${NC}"

for service in api web docs mcp; do
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps "$service" | grep -q "Up"; then
        echo -e "${GREEN}✅ $service is running${NC}"
    else
        echo -e "${YELLOW}⚠️  $service is not running${NC}"
    fi
done

# Show service URLs
echo ""
echo -e "${GREEN}🎉 Services started successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Service URLs:${NC}"
echo -e "  ${GREEN}🌐 Main Site:${NC}     http://snapback.dev"
echo -e "  ${GREEN}📱 Console:${NC}       http://console.snapback.dev"
echo -e "  ${GREEN}📚 Docs:${NC}          http://docs.snapback.dev"
echo -e "  ${GREEN}🔌 API:${NC}           http://api.snapback.dev:8080"
echo -e "  ${GREEN}🤖 MCP Server:${NC}    http://mcp.snapback.dev:8081"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo -e "  ${GREEN}📈 Prometheus:${NC}    http://localhost:9090"
echo -e "  ${GREEN}📊 Grafana:${NC}       http://localhost:3002 (admin/admin)"
echo -e "  ${GREEN}🔍 Jaeger:${NC}        http://localhost:16686"
echo -e "  ${GREEN}📧 MailHog:${NC}       http://localhost:8025"
echo ""
echo -e "${BLUE}💡 Useful Commands:${NC}"
echo -e "  ${YELLOW}View logs:${NC}        docker-compose -f $COMPOSE_FILE logs -f"
echo -e "  ${YELLOW}Stop services:${NC}    docker-compose -f $COMPOSE_FILE down"
echo -e "  ${YELLOW}Restart service:${NC}  docker-compose -f $COMPOSE_FILE restart <service>"
echo -e "  ${YELLOW}Service status:${NC}   docker-compose -f $COMPOSE_FILE ps"
echo ""

# Optionally show logs
read -p "Show live logs? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f
fi
