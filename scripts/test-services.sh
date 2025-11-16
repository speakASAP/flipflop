#!/bin/bash

# Test all e-commerce services
# Usage: ./scripts/test-services.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🧪 Testing e-commerce services"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Service configuration (service:port)
SERVICES="user-service:3004 product-service:3002 order-service:3003 supplier-service:3006 ai-service:3007 analytics-service:3008 api-gateway:3001 frontend:3000"

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

FAILED=0
PASSED=0

# Test backend services
for service in user-service product-service order-service supplier-service ai-service analytics-service api-gateway; do
  port=$(get_port $service)
  echo -n "Testing $service (port $port)... "
  
  HEALTH_URL="http://localhost:$port/health"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$HEALTH_URL" 2>/dev/null || echo "000")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
  fi
done

# Test frontend
echo -n "Testing frontend (port 3000)... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://localhost:3000" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All services are healthy!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some services failed health checks${NC}"
  exit 1
fi

