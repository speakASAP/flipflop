# FlipFlop Operational Runbook

## Production URLs

- Storefront: `https://flipflop.alfares.cz/`
- Product API: `https://flipflop.alfares.cz/api/products`
- Logging health: `https://logging.alfares.cz/health`

## Remote Access

```bash
ssh alfares
cd /home/ssf/Documents/Github/flipflop-service
```

Use one-off commands in this form:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service && <command>'
```

## Deploy

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service && ./scripts/deploy.sh'
```

The deploy script builds service images, updates Kubernetes manifests, waits
for rollout, and runs the configured smoke checks.

## Final Smoke Checks

```bash
ssh alfares 'curl -I -H "Cache-Control: no-cache" "https://flipflop.alfares.cz/"'
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service && node scripts/smoke-checkout.js'
```

Expected baseline:

- Homepage returns HTTP 200.
- Product API returns products from catalog.
- Checkout smoke creates a pending order and returns a payment redirect URL.
- Cart stock check rejects overstock requests with HTTP 400.

## Kubernetes Checks

```bash
ssh alfares 'kubectl -n statex-apps get deploy flipflop-service flipflop-frontend flipflop-product-service flipflop-cart-service flipflop-order-service flipflop-user-service catalog-microservice warehouse-service payments-microservice logging-service'
```

Expected baseline: all listed deployments are available, typically `1/1`.

## Monitoring Coverage

```bash
ssh alfares 'curl -s "https://logging.alfares.cz/health"'
ssh alfares 'kubectl -n statex-apps logs deploy/flipflop-product-service --tail=120 | grep OPERATIONAL_ALERT'
```

Product-service emits `OPERATIONAL_ALERT catalog_empty_or_unavailable` when the
catalog is empty or unavailable for a product listing request.

## Secrets

Production secrets are sourced through Vault and ExternalSecrets. Do not print
secret values in terminal output, logs, reports, or handoff notes.

`AI_SERVICE_TOKEN` is stored at Vault path `secret/prod/flipflop-service` and
synced into `flipflop-service-secret`. Presence can be checked safely from the
pod without exposing the value:

```bash
ssh alfares 'kubectl -n statex-apps exec deploy/flipflop-service -- sh -c "for k in AI_SERVICE_TOKEN AI_SERVICE_URL CATALOG_SERVICE_URL JWT_SECRET; do if [ -n \"$(eval echo \\$$k)\" ]; then echo \"$k=present\"; else echo \"$k=missing\"; fi; done"'
```

## AI SEO Drafts

Generate draft-only content with:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service && node scripts/generate-seo-drafts.js --limit 3'
```

Generated content must remain under `seoData.aiDraft.reviewStatus = "draft"`
until a human reviewer explicitly publishes approved metadata into publishable
`seoData.meta*` fields.

## Residual Payment Work

The owner deferred final production payment-provider setup. Before real paid
traffic, complete and verify:

- PayU production credentials and callback handling.
- PayPal production credentials and callback handling.
- GP WebPay merchant/key/application/description configuration.
- Stripe webhook secret or an approved verified callback path.
