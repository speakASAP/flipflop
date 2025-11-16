#!/bin/bash

# Stop all e-commerce services
# Usage: ./scripts/stop-services.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🛑 Stopping e-commerce services..."
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Service configuration
declare -a SERVICES=(
  "frontend"
  "api-gateway"
  "user-service"
  "product-service"
  "order-service"
  "supplier-service"
  "ai-service"
  "analytics-service"
)

# Stop services in reverse order
for service in "${SERVICES[@]}"; do
  echo -n "  Stopping $service... "
  
  PID_FILE="$PROJECT_ROOT/logs/${service}.pid"
  
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
      kill $PID 2>/dev/null || true
      # Wait a bit and force kill if still running
      sleep 1
      if ps -p $PID > /dev/null 2>&1; then
        kill -9 $PID 2>/dev/null || true
      fi
      rm -f "$PID_FILE"
      echo -e "${GREEN}Stopped${NC}"
    else
      rm -f "$PID_FILE"
      echo -e "${YELLOW}Not running${NC}"
    fi
  else
    # Try to find and kill by port
    case $service in
      "frontend")
        PORT=3000
        ;;
      "api-gateway")
        PORT=3001
        ;;
      "product-service")
        PORT=3002
        ;;
      "order-service")
        PORT=3003
        ;;
      "user-service")
        PORT=3004
        ;;
      "supplier-service")
        PORT=3006
        ;;
      "ai-service")
        PORT=3007
        ;;
      "analytics-service")
        PORT=3008
        ;;
    esac
    
    PID=$(lsof -ti :$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
      kill $PID 2>/dev/null || true
      sleep 1
      if ps -p $PID > /dev/null 2>&1; then
        kill -9 $PID 2>/dev/null || true
      fi
      echo -e "${GREEN}Stopped${NC} (by port)"
    else
      echo -e "${YELLOW}Not running${NC}"
    fi
  fi
done

# Also kill any remaining nest/next processes
echo ""
echo "  Cleaning up remaining processes..."
pkill -f "nest start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

echo ""
echo "✅ All services stopped!"

