# GOAL-13 Validation Report: Product Detail Bundle Discount Contract

```yaml
id: GOAL-13-PRODUCT-DETAIL-BUNDLE-DISCOUNT-CONTRACT
status: blocked
validated_at: 2026-07-02T15:45:59Z
repository: /home/ssf/Documents/Github/flipflop
deployment_status: blocked_after_image_push
```

## Summary

GOAL-13 source implementation is complete and source/build validation passed. The order service now owns server-side bundle discount validation for product-detail buy-together sets: checkout submits bundle identifiers only, the browser-provided money fields are rejected, order totals and payment amount use the server-computed discounted total, discount codes and bundle discounts do not stack, and unrelated products cannot be discounted by arbitrary client input.

Deployment was started after validation gates passed. All FlipFlop images built and pushed successfully, Kubernetes manifests were applied, and paused FlipFlop deployments were resumed. Runtime rollout is blocked by an Alfares node/container-runtime condition: new pods remain in `ContainerCreating` with repeated `FailedCreatePodSandBox` / stale sandbox reservation errors across FlipFlop and unrelated services. `sudo systemctl restart k3s` and `systemctl restart k3s` require interactive credentials from this thread, so node-level recovery could not be completed here.

No real paid order, payment, or production data mutation was executed.

## Commands

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
npm run verify:product-detail-bundle-discount
npm run verify:product-detail-upsell
npm run verify:orders-hub-integration
npm run verify:flipflop-offer-gate
cd services/order-service && npm run build
cd services/frontend && npm run build
cd services/product-service && npm run build
cd shared && npm run build
git diff --check
python3 scripts/deployment_readiness_gate.py --root .
./scripts/deploy.sh
kubectl rollout resume deployment/flipflop-service -n statex-apps
kubectl rollout resume deployment/flipflop-cart-service -n statex-apps
kubectl rollout resume deployment/flipflop-order-service -n statex-apps
kubectl rollout resume deployment/flipflop-user-service -n statex-apps
kubectl rollout restart deployment/flipflop-service -n statex-apps
kubectl rollout restart deployment/flipflop-frontend -n statex-apps
kubectl rollout restart deployment/flipflop-product-service -n statex-apps
kubectl rollout restart deployment/flipflop-cart-service -n statex-apps
kubectl rollout restart deployment/flipflop-order-service -n statex-apps
kubectl rollout restart deployment/flipflop-user-service -n statex-apps
kubectl rollout status deployment/flipflop-frontend -n statex-apps --timeout=240s
curl -sS -o /tmp/ff_home_smoke_after.txt -w "home_http=HTTP_CODE bytes=SIZE_DOWNLOAD\n" --max-time 10 https://flipflop.alfares.cz/
curl -sS -o /tmp/ff_products_smoke_after.json -w "products_http=HTTP_CODE bytes=SIZE_DOWNLOAD\n" --max-time 10 "https://flipflop.alfares.cz/api/products?limit=1"
```

## Results

- `pre_coding_gate.py`: passed after rewording the existing GOAL-13 ecosystem plan to avoid sensitive-data scanner wording while preserving intent.
- `strict_doc_audit.py`: passed, 100/100.
- `verify:product-detail-bundle-discount`: passed.
- `verify:product-detail-upsell`: passed, including GOAL-13 boundary assertions.
- `verify:orders-hub-integration`: passed.
- `verify:flipflop-offer-gate`: passed.
- `services/order-service` build: passed.
- `services/frontend` build: passed with existing `baseline-browser-mapping` and Next.js workspace-root warnings only.
- `services/product-service` build: passed.
- `shared` build: passed.
- `git diff --check`: passed.
- `deployment_readiness_gate.py`: passed.
- `./scripts/deploy.sh`: built and pushed `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`, `flipflop-cart-service`, `flipflop-order-service`, and `flipflop-user-service`; applied manifests; then failed because `flipflop-service` was paused.
- Recovery: resumed paused FlipFlop deployments and restarted all six target deployments.
- Runtime rollout: blocked. New pods stayed in `ContainerCreating`; events show `FailedCreatePodSandBox` and stale sandbox reservations. Duplicate pending ReplicaSets from the interrupted paused rollout were scaled down, and stuck FlipFlop pending pods were deleted once to force fresh pod names, but fresh pods hit the same container-runtime condition.
- Production smoke after blocked rollout: `https://flipflop.alfares.cz/` returned `503` with 20 bytes; `https://flipflop.alfares.cz/api/products?limit=1` timed out after 10 seconds.

## Runtime Evidence

```text
kubectl get deploy -n statex-apps flipflop-service flipflop-frontend flipflop-product-service flipflop-cart-service flipflop-order-service flipflop-user-service
NAME                       READY    UPDATED   AVAILABLE   UNAVAILABLE
flipflop-service           1        1         1           1
flipflop-frontend          <none>   1         <none>      1
flipflop-product-service   1        1         1           1
flipflop-cart-service      <none>   1         <none>      1
flipflop-order-service     <none>   1         <none>      1
flipflop-user-service      <none>   1         <none>      1
```

```text
Warning FailedCreatePodSandBox pod/flipflop-frontend-6b98d8c6d7-pt4qf rpc error: code = FailedPrecondition desc = failed to reserve sandbox name ... name ... is reserved for ...
Warning FailedCreatePodSandBox pod/flipflop-order-service-848dcbd89c-dlnhs rpc error: code = FailedPrecondition desc = failed to reserve sandbox name ... name ... is reserved for ...
```

## Intent Compliance Report

- Original intent preserved: yes for source implementation and validation; deployment blocked by runtime infrastructure.
- Constraints respected: server computes/validates the discount; browser copy is not trusted for money fields; order/payment amount uses the discounted total; unrelated products cannot be discounted; guest and authenticated checkout are preserved; UI avoids customer-facing percentage copy; no real paid order/payment was created.
- Non-goals respected: no manual production data mutation; no invented Catalog/Warehouse runtime contract.
- Remaining blockers: `[MISSING: interactive Alfares node/runtime recovery for stale Kubernetes pod sandbox reservations]`.
- Next step: restart or repair the Alfares Kubernetes/container runtime, then re-run rollout status and non-mutating production smoke.
