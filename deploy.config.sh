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

# ESO Owner+Retain leaves keys removed from spec in the existing Secret.
# Strip them before pods roll, or envFrom keeps leaking pair JWTs.
deploy_post_manifests() {
  local ns="${NAMESPACE:-statex-apps}"
  local leaked key
  leaked="$(kubectl get secret flipflop-service-secret -n "$ns" -o json \
    | jq -r '.data | keys[]' \
    | grep -E '^(PRODUCT_(LOGGING|WAREHOUSE|CATALOG)_SERVICE_TOKEN|CART_CATALOG_SERVICE_TOKEN|ORDER_CATALOG_SERVICE_TOKEN|CATALOG_INTERNAL_SERVICE_TOKEN)$' \
    || true)"
  if [ -n "$leaked" ]; then
    echo "Removing pair-token keys left in flipflop-service-secret:"
    echo "$leaked"
    while IFS= read -r key; do
      [ -z "$key" ] && continue
      kubectl patch secret flipflop-service-secret -n "$ns" --type=json \
        -p="[{\"op\":\"remove\",\"path\":\"/data/${key}\"}]"
    done <<< "$leaked"
    leaked="$(kubectl get secret flipflop-service-secret -n "$ns" -o json \
      | jq -r '.data | keys[]' \
      | grep -E '^(PRODUCT_(LOGGING|WAREHOUSE|CATALOG)_SERVICE_TOKEN|CART_CATALOG_SERVICE_TOKEN|ORDER_CATALOG_SERVICE_TOKEN|CATALOG_INTERNAL_SERVICE_TOKEN)$' \
      || true)"
    if [ -n "$leaked" ]; then
      echo "FAIL: pair tokens still in shared secret: ${leaked}" >&2
      return 1
    fi
  fi
  for key in flipflop-product-service-tokens flipflop-cart-service-tokens flipflop-order-service-tokens; do
    kubectl get secret "$key" -n "$ns" >/dev/null \
      || { echo "FAIL: missing Secret ${key}" >&2; return 1; }
  done
}

deploy_post_verify() {
  curl -fsS --max-time 10 https://flipflop.alfares.cz/ >/dev/null
  curl -fsS --max-time 10 'https://flipflop.alfares.cz/api/products?limit=1' >/dev/null

  local ns="${NAMESPACE:-statex-apps}"
  local pod names
  pod="$(kubectl get pod -n "$ns" -l app=flipflop-cart-service --field-selector=status.phase=Running \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.deletionTimestamp}{"\n"}{end}' \
    | awk -F'\t' '$2 == "" { print $1; exit }')"
  [ -n "$pod" ] || { echo "FAIL: no running flipflop-cart-service pod" >&2; return 1; }
  names="$(kubectl exec -n "$ns" "$pod" -c cart-service -- \
    sh -c 'awk "BEGIN{for (k in ENVIRON) print k}"')"
  printf '%s\n' "$names" | grep -qx 'CATALOG_SERVICE_TOKEN' \
    || { echo "FAIL: cart pod missing CATALOG_SERVICE_TOKEN" >&2; return 1; }
  if printf '%s\n' "$names" | grep -Eq '^(PRODUCT_(LOGGING|WAREHOUSE|CATALOG)_SERVICE_TOKEN|CART_CATALOG_SERVICE_TOKEN|ORDER_CATALOG_SERVICE_TOKEN)$'; then
    echo "FAIL: cart pod still has a pair token that belongs to another caller" >&2
    return 1
  fi
}
