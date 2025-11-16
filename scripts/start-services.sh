#!/bin/bash

# Start all e-commerce services
# Usage: ./scripts/start-services.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🚀 Starting e-commerce services..."
echo "=================================="

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

# Start backend services first
echo ""
echo "📦 Starting backend services..."
for service in user-service product-service order-service supplier-service ai-service analytics-service; do
  port=$(get_port $service)
  echo -n "  Starting $service (port $port)... "
  
  cd "$PROJECT_ROOT/services/$service"
  
  # Check if already running
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Already running${NC}"
  else
    # Clean dist if it has wrong structure (from root build)
    if [ -d "dist/services" ]; then
      rm -rf dist
    fi
    # Build first to create dist/main.js, then start in watch mode
    if [ ! -f "dist/main.js" ]; then
      echo -n " (building...) "
      npm run build > "$PROJECT_ROOT/logs/${service}-build.log" 2>&1 || echo "Build may have warnings"
    fi
    # Start in watch mode (will recompile on changes)
    npm run start:dev > "$PROJECT_ROOT/logs/${service}.log" 2>&1 &
    echo $! > "$PROJECT_ROOT/logs/${service}.pid"
    echo -e "${GREEN}Started${NC} (PID: $(cat "$PROJECT_ROOT/logs/${service}.pid"))"
    sleep 3
  fi
done

# Start API Gateway
echo ""
echo "🌐 Starting API Gateway..."
service="api-gateway"
port=$(get_port $service)
echo -n "  Starting $service (port $port)... "

cd "$PROJECT_ROOT/services/$service"

if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${YELLOW}Already running${NC}"
else
  # Clean dist if it has wrong structure (from root build)
  if [ -d "dist/services" ]; then
    rm -rf dist
  fi
  # Build first to create dist/main.js, then start in watch mode
  if [ ! -f "dist/main.js" ]; then
    echo -n " (building...) "
    npm run build > "$PROJECT_ROOT/logs/${service}-build.log" 2>&1 || echo "Build may have warnings"
  fi
  # Start in watch mode (will recompile on changes)
  npm run start:dev > "$PROJECT_ROOT/logs/${service}.log" 2>&1 &
  echo $! > "$PROJECT_ROOT/logs/${service}.pid"
  echo -e "${GREEN}Started${NC} (PID: $(cat "$PROJECT_ROOT/logs/${service}.pid"))"
  sleep 3
fi

# Start Frontend
echo ""
echo "🎨 Starting Frontend..."
service="frontend"
port=$(get_port $service)
echo -n "  Starting $service (port $port)... "

cd "$PROJECT_ROOT/services/$service"

if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${YELLOW}Already running${NC}"
else
  NEXT_PUBLIC_API_URL=http://localhost:3001/api npm run dev > "$PROJECT_ROOT/logs/${service}.log" 2>&1 &
  echo $! > "$PROJECT_ROOT/logs/${service}.pid"
  echo -e "${GREEN}Started${NC} (PID: $(cat "$PROJECT_ROOT/logs/${service}.pid"))"
  sleep 3
fi

echo ""
echo "✅ All services started!"
echo ""
echo "Service URLs:"
echo "  Frontend:     http://localhost:3000"
echo "  API Gateway:  http://localhost:3001"
echo "  User Service: http://localhost:3004"
echo "  Product:      http://localhost:3002"
echo "  Order:        http://localhost:3003"
echo "  Supplier:     http://localhost:3006"
echo "  AI Service:   http://localhost:3007"
echo "  Analytics:    http://localhost:3008"
echo ""
echo "Logs are available in: $PROJECT_ROOT/logs/"
echo ""
echo "Use './scripts/status-services.sh' to check service status"
echo "Use './scripts/stop-services.sh' to stop all services"

