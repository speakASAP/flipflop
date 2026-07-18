#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'

SERVICE_NAME="flipflop-service"
NAMESPACE="${NAMESPACE:-statex-apps}"
K8S_DIR="$PROJECT_ROOT/k8s"
REGISTRY="${REGISTRY:-localhost:5000}"

# shellcheck disable=SC1091
source "$(dirname "$PROJECT_ROOT")/shared/scripts/load-deploy-phase-timing.sh" "$PROJECT_ROOT" 2>/dev/null \
  || source "$HOME/Documents/Github/shared/scripts/load-deploy-phase-timing.sh" "$PROJECT_ROOT" \
  || { echo "Error: deploy timing library not found" >&2; exit 1; }
deploy_timing_init "$SERVICE_NAME"

# Tag describes the WORKING TREE that is actually built, not just git HEAD:
# a tag derived from HEAD alone repeats itself when files changed without a
# commit, which makes `kubectl set image` a no-op and silently keeps the old
# image running.
compute_default_tag() {
  local head dirty root
  root="${PROJECT_ROOT:-$(pwd)}"
  head="$(git -C "$root" rev-parse --short HEAD 2>/dev/null || true)"
  if [ -z "$head" ]; then
    echo "build-$(date -u +%Y%m%d%H%M%S)"
    return
  fi
  dirty="$(git -C "$root" status --porcelain 2>/dev/null || true)"
  if [ -n "$dirty" ]; then
    echo "${head}-wt$(date -u +%Y%m%d%H%M%S)"
  else
    echo "$head"
  fi
}
IMAGE_TAG="${1:-$(compute_default_tag)}"

build_and_push() {
  local image="$1"
  local dockerfile="$2"
  shift 2
  echo -e "${YELLOW}Building ${image}...${NC}"
  docker build "$@" -f "$dockerfile" -t "${REGISTRY}/${image}:${IMAGE_TAG}" -t "${REGISTRY}/${image}:latest" "$PROJECT_ROOT"
  docker push "${REGISTRY}/${image}:${IMAGE_TAG}"
  docker push "${REGISTRY}/${image}:latest"
}

set_image() {
  local deployment="$1" container="$2" image="$3"
  local current
  current=$(kubectl get deployment/"$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true)
  kubectl set image "deployment/${deployment}" "${container}=${REGISTRY}/${image}:${IMAGE_TAG}" -n "$NAMESPACE"
  if [ "$current" = "${REGISTRY}/${image}:${IMAGE_TAG}" ]; then
    kubectl rollout restart deployment/"$deployment" -n "$NAMESPACE"
  fi
}

preflight_service_health() {
  echo -e "${YELLOW}Preflight: checking Kubernetes and registry access...${NC}"

  if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    echo -e "${RED}Namespace not found: $NAMESPACE${NC}"
    exit 1
  fi

  if ! kubectl get nodes >/dev/null 2>&1; then
    echo -e "${RED}kubectl cannot reach cluster${NC}"
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Docker is not available for image builds${NC}"
    exit 1
  fi

  echo -e "${GREEN}Preflight passed${NC}"
}

wait_for_rollout() {
  local deployment="$1"
  echo -e "${YELLOW}Waiting for ${deployment} rollout...${NC}"
  deploy_timing_k8s_rollout_wait kubectl "$deployment" "$NAMESPACE"
}

echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  FlipFlop - Kubernetes Deployment${NC}"
echo -e "${BLUE}==========================================================${NC}"

if [ ! -d "$K8S_DIR" ]; then
  echo -e "${RED}Missing k8s directory: $K8S_DIR${NC}"
  exit 1
fi

deploy_timing_run_phase "Preflight" preflight_service_health

deploy_timing_phase_start "Build and push images"
build_and_push "flipflop-service" "Dockerfile"
build_and_push "flipflop-frontend" "services/frontend/Dockerfile" \
  --build-arg NEXT_PUBLIC_API_URL="https://flipflop.alfares.cz/api" \
  --build-arg API_URL="http://flipflop-service:3000/api"
build_and_push "flipflop-product-service" "services/product-service/Dockerfile"
build_and_push "flipflop-cart-service" "services/cart-service/Dockerfile"
build_and_push "flipflop-order-service" "services/order-service/Dockerfile"
build_and_push "flipflop-user-service" "services/user-service/Dockerfile"
deploy_timing_phase_end "Build and push images"

deploy_timing_phase_start "Apply Kubernetes manifests"
echo -e "${YELLOW}Applying Kubernetes manifests...${NC}"
for manifest in configmap.yaml external-secret.yaml deployment.yaml service.yaml ingress.yaml; do
  if [ -f "$K8S_DIR/$manifest" ]; then
    kubectl apply -f "$K8S_DIR/$manifest" -n "$NAMESPACE"
  fi
done
echo -e "${GREEN}OK Kubernetes manifests applied${NC}"
deploy_timing_phase_end "Apply Kubernetes manifests"

deploy_timing_phase_start "Set deployment images"
set_image flipflop-service         api-gateway     flipflop-service
set_image flipflop-frontend        frontend        flipflop-frontend
set_image flipflop-product-service product-service flipflop-product-service
set_image flipflop-cart-service    cart-service    flipflop-cart-service
set_image flipflop-order-service   order-service   flipflop-order-service
set_image flipflop-user-service    user-service    flipflop-user-service
deploy_timing_phase_end "Set deployment images"

deploy_timing_phase_start "Wait for rollouts"
for deployment in \
  flipflop-service \
  flipflop-frontend \
  flipflop-product-service \
  flipflop-cart-service \
  flipflop-order-service \
  flipflop-user-service; do
  wait_for_rollout "$deployment"
done
deploy_timing_phase_end "Wait for rollouts"

deploy_timing_phase_start "Post-deploy status"
echo -e "${YELLOW}Current FlipFlop pods:${NC}"
kubectl get pods -n "$NAMESPACE" -l managed-by=k8s-migration | grep -E 'flipflop|NAME' || true
echo -e "${YELLOW}HTTP checks:${NC}"
curl -fsS --max-time 10 https://flipflop.alfares.cz/ >/dev/null
curl -fsS --max-time 10 'https://flipflop.alfares.cz/api/products?limit=1' >/dev/null
deploy_timing_phase_end "Post-deploy status"

deploy_timing_finish_success "FlipFlop"
DEPLOY_TIMING_FINISHED=1
exit 0
