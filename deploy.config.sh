# deploy.config.sh — declaration consumed by shared/scripts/deploy.sh.
# See shared/docs/DEPLOY_STANDARDIZATION_REPORT.md section 6/7 (Phase D) for the design.
# scripts/deploy.sh is still the live, authoritative deploy path.
#
# 6 images/deployments, all defined in single multi-document k8s/deployment.yaml
# and k8s/service.yaml files (not split per-service) -- MANIFESTS is just the
# runner default. scripts/deploy.sh was already fixed with the tag scheme
# earlier this session (was the flipflop-service-only case in Phase C).

SERVICE_NAME="flipflop-service"
PORT="3000"

IMAGES=(
  "flipflop-service|.||"
  "flipflop-frontend|.|services/frontend/Dockerfile|--build-arg NEXT_PUBLIC_API_URL=https://flipflop.alfares.cz/api --build-arg API_URL=http://flipflop-service:3000/api"
  "flipflop-product-service|.|services/product-service/Dockerfile|"
  "flipflop-cart-service|.|services/cart-service/Dockerfile|"
  "flipflop-order-service|.|services/order-service/Dockerfile|"
  "flipflop-user-service|.|services/user-service/Dockerfile|"
)

DEPLOYMENTS=(
  "flipflop-service|api-gateway|flipflop-service"
  "flipflop-frontend|frontend|flipflop-frontend"
  "flipflop-product-service|product-service|flipflop-product-service"
  "flipflop-cart-service|cart-service|flipflop-cart-service"
  "flipflop-order-service|order-service|flipflop-order-service"
  "flipflop-user-service|user-service|flipflop-user-service"
)

deploy_post_verify() {
  curl -fsS --max-time 10 https://flipflop.alfares.cz/ >/dev/null
  curl -fsS --max-time 10 'https://flipflop.alfares.cz/api/products?limit=1' >/dev/null
}
