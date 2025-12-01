#!/bin/bash

# SnapBack Docker - Debug Information Collector
# Collects diagnostic information for troubleshooting

set -e

echo "🔍 SnapBack Docker - Debug Information Collector"
echo "================================================"
echo ""

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"
ENV_FILE="${ENV_FILE:-.env.docker}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$PROJECT_DIR"

echo "📋 System Information"
echo "--------------------"
echo "Date: $(date)"
echo "OS: $(uname -s)"
echo "OS Version: $(uname -r)"
echo "Architecture: $(uname -m)"
echo ""

echo "🐳 Docker Information"
echo "--------------------"
if docker info > /dev/null 2>&1; then
    docker version
    echo ""
    docker info | grep -E "Server Version|Storage Driver|Cgroup Driver|Memory|CPUs"
else
    echo "❌ Docker is not running"
fi
echo ""

echo "📦 Docker Compose Information"
echo "-----------------------------"
docker-compose version || echo "❌ docker-compose not found"
echo ""

echo "💾 Disk Space"
echo "-------------"
df -h | head -n 2
echo ""
docker system df || echo "❌ Cannot get Docker disk usage"
echo ""

echo "🌐 Network Connectivity"
echo "----------------------"
ping -c 1 google.com > /dev/null 2>&1 && echo "✅ Internet: OK" || echo "❌ Internet: FAIL"
ping -c 1 127.0.0.1 > /dev/null 2>&1 && echo "✅ Localhost: OK" || echo "❌ Localhost: FAIL"
echo ""

echo "🏠 Hosts File Configuration"
echo "---------------------------"
if grep -q "snapback.dev" /etc/hosts; then
    grep "snapback.dev" /etc/hosts
else
    echo "❌ No snapback.dev entries found in /etc/hosts"
fi
echo ""

echo "📂 Project Files"
echo "---------------"
echo "Project directory: $PROJECT_DIR"
ls -la | grep -E "docker-compose|Dockerfile|.env" || echo "No Docker files found"
echo ""

echo "🔐 Environment Configuration"
echo "---------------------------"
if [ -f "$ENV_FILE" ]; then
    echo "✅ $ENV_FILE exists"
    echo "Environment variables (sensitive values hidden):"
    grep -E "^[A-Z_]+=" "$ENV_FILE" | sed 's/=.*/=***HIDDEN***/' | head -n 20
else
    echo "❌ $ENV_FILE not found"
fi
echo ""

echo "📊 Docker Services Status"
echo "-------------------------"
if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps > /dev/null 2>&1; then
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
else
    echo "❌ Cannot get services status"
fi
echo ""

echo "🔍 Running Containers"
echo "--------------------"
docker ps -a | grep snapback || echo "No SnapBack containers found"
echo ""

echo "📦 Docker Images"
echo "---------------"
docker images | grep snapback || echo "No SnapBack images found"
echo ""

echo "💿 Docker Volumes"
echo "----------------"
docker volume ls | grep snapback || echo "No SnapBack volumes found"
echo ""

echo "🌐 Docker Networks"
echo "-----------------"
docker network ls | grep snapback || echo "No SnapBack networks found"
echo ""

echo "📝 Service Logs (last 20 lines each)"
echo "------------------------------------"
for service in postgres redis api web docs mcp nginx; do
    echo ""
    echo "--- $service logs ---"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=20 "$service" 2>&1 || echo "Cannot get logs for $service"
done
echo ""

echo "🔌 Port Usage"
echo "-------------"
echo "Checking common ports..."
for port in 80 3000 3001 5432 6379 8080 8081; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo "Port $port: IN USE"
        lsof -i :$port | head -n 2
    else
        echo "Port $port: FREE"
    fi
done
echo ""

echo "🏥 Health Checks"
echo "---------------"
echo "Testing local endpoints..."

test_endpoint() {
    local url=$1
    local name=$2
    if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url" > /dev/null 2>&1; then
        echo "✅ $name: OK"
    else
        echo "❌ $name: FAIL"
    fi
}

test_endpoint "http://localhost:3000" "Web (localhost:3000)"
test_endpoint "http://localhost:8080/api/health" "API (localhost:8080)"
test_endpoint "http://snapback.dev" "Web (snapback.dev)"
test_endpoint "http://api.snapback.dev:8080" "API (api.snapback.dev)"
echo ""

echo "📊 Resource Usage"
echo "----------------"
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q snapback; then
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep snapback
else
    echo "No running containers to monitor"
fi
echo ""

echo "✅ Debug information collection complete!"
echo ""
echo "💡 To save this output:"
echo "   ./ops/scripts/docker-debug.sh > debug-$(date +%Y%m%d_%H%M%S).txt"
