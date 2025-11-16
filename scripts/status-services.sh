#!/bin/bash

# Check status of all e-commerce services
# Usage: ./scripts/status-services.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "📊 Service Status"
echo "================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service configuration (service:port)
SERVICES="frontend:3000 api-gateway:3001 product-service:3002 order-service:3003 user-service:3004 supplier-service:3006 ai-service:3007 analytics-service:3008"

# Function to get port for a service
get_port() {
  local service=$1
  for svc_port in $SERVICES; do
    if [[ "$svc_port" == "$service:"* ]]; then
      echo "${svc_port#*:}"
      return
    fi
  done
}

# Check each service
for svc_port in $SERVICES; do
  service="${svc_port%:*}"
  port="${svc_port#*:}"
  echo -n "  $service (port $port): "
  
  # Check if port is listening
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    # Try to get health status
    if [ "$service" != "frontend" ]; then
      HEALTH_URL="http://localhost:$port/health"
      HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$HEALTH_URL" 2>/dev/null || echo "000")
      
      if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Running (Healthy)${NC}"
      else
        echo -e "${YELLOW}⚠ Running (Health check failed)${NC}"
      fi
    else
      HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "http://localhost:$port" 2>/dev/null || echo "000")
      if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Running${NC}"
      else
        echo -e "${YELLOW}⚠ Running (Not responding)${NC}"
      fi
    fi
  else
    echo -e "${RED}✗ Not running${NC}"
  fi
done

echo ""
echo "Service URLs:"
for svc_port in $SERVICES; do
  service="${svc_port%:*}"
  port="${svc_port#*:}"
  if [ "$service" = "frontend" ]; then
    echo "  $service:     http://localhost:$port"
  else
    echo "  $service:  http://localhost:$port"
  fi
done

echo ""
echo "Logs: $PROJECT_ROOT/logs/"

