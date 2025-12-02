#!/bin/bash

# Docker Memory & CPU Monitoring Script
# Usage: ./docker-memory-monitor.sh [interval]
# Example: ./docker-memory-monitor.sh 5  (refresh every 5 seconds)

INTERVAL=${1:-2}

echo "Docker Container Resource Usage Monitoring"
echo "==========================================="
echo "Refresh interval: ${INTERVAL}s"
echo "Press Ctrl+C to stop"
echo ""

while true; do
  clear

  # Print header
  echo "┌─────────────────────────────────────────────────────────────────────────────────┐"
  echo "│ Docker Container Resource Usage - $(date +'%Y-%m-%d %H:%M:%S')                              │"
  echo "├─────────────────────────────────────────────────────────────────────────────────┤"

  # Get container stats
  docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.CPUPerc}}\t{{.NetIO}}" 2>/dev/null | \
    awk 'NR>1 {
      printf "│ %-25s %-15s %-10s %-20s │\n", $1, $2" "$3, $4, $5" "$6
    }'

  echo "├─────────────────────────────────────────────────────────────────────────────────┤"

  # Calculate totals
  TOTAL_MEM=$(docker stats --no-stream --format "{{.MemUsage}}" 2>/dev/null | \
    grep -oE '[0-9.]+M[iB]*' | sed 's/MiB\|M$//' | awk '{sum+=$1} END {printf "%.0f", sum}')

  echo "│ Total Memory Used: ~${TOTAL_MEM}MB                                                      │"
  echo "└─────────────────────────────────────────────────────────────────────────────────┘"
  echo ""

  # PostgreSQL specific stats
  if docker ps --format "{{.Names}}" | grep -q "snapback-postgres"; then
    echo "PostgreSQL Specific Stats:"
    echo "─────────────────────────"
    docker exec snapback-postgres psql -U snapback -d snapback -c "
      SELECT
        datname as Database,
        count(*) as Connections,
        pg_database.databasesize(datname) as Size
      FROM pg_stat_activity
      RIGHT JOIN (SELECT datname FROM pg_database) AS pg_database ON datname = pg_database.datname
      GROUP BY datname
      ORDER BY databasesize DESC;
    " 2>/dev/null || echo "PostgreSQL not ready"
    echo ""
  fi

  # Sleep before refresh
  echo "Refreshing in ${INTERVAL} seconds... (Ctrl+C to exit)"
  sleep "$INTERVAL"
done
