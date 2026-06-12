# GOAL 04 Validation Report: Agent Content And SEO

## Status

Done on 2026-06-12.

## Commands

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service && node --check scripts/generate-seo-drafts.js && node scripts/generate-seo-drafts.js --dry-run --limit 3'
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service/services/product-service && npm run build'
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service/services/frontend && npm run build'
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service && node scripts/generate-seo-drafts.js --limit 1'
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service && ./scripts/deploy.sh'
ssh alfares 'curl -s -H "Cache-Control: no-cache" "https://flipflop.alfares.cz/api/products/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"'
ssh alfares 'curl -s -H "Cache-Control: no-cache" "https://flipflop.alfares.cz/products/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"'
ssh alfares 'VAULT_ADDR=http://192.168.88.53:8200 vault kv patch secret/prod/flipflop-service AI_SERVICE_TOKEN=<generated-token>'
ssh alfares 'kubectl -n statex-apps annotate externalsecret flipflop-service-secret force-sync=$(date +%s) --overwrite'
ssh alfares 'kubectl -n statex-apps exec deploy/flipflop-service -- sh -c "for k in AI_SERVICE_TOKEN AI_SERVICE_URL CATALOG_SERVICE_URL JWT_SECRET; do ...; done"'
ssh alfares 'kubectl -n statex-apps exec "$POD" -- node /tmp/generate-seo-drafts.js --limit 3'
```

## Results

- Existing catalog SEO surface: PASS. Catalog products already expose
  `seoData` with fields such as `metaTitle`, `metaDescription`, `keywords`,
  and `slug`.
- FlipFlop product API SEO pass-through: PASS. Live product API now returns
  `seoData` and `tags` from catalog data.
- Storefront metadata rendering: PASS. Product detail metadata now prefers
  publishable `seoData.metaTitle`, `seoData.metaDescription`, and
  `seoData.keywords`, with approved product facts as fallback. Draft-only
  content is ignored.
- Approval-first draft workflow: PASS. Added
  `scripts/generate-seo-drafts.js`; it selects priority products, calls
  `ai-microservice` using `model_tier: "free"`, and writes generated content
  only under `seoData.aiDraft` with `reviewStatus: "draft"`.
- Vault token wiring: PASS. Generated a `flipflop-service` AI service JWT from
  the AI service Vault signer secret, stored it as `AI_SERVICE_TOKEN` under
  `secret/prod/flipflop-service`, synced ExternalSecrets, and verified
  Kubernetes/pod presence without printing the token.
- Priority drafts: PASS. Products `FF-SANDAL-001`, `FF-BAG-TRAVEL-002`, and
  `FF-LED-LAMP-003` now have `seoData.aiDraft.reviewStatus = "draft"`.
- Fake-content prevention: PASS. Before Vault wiring, non-dry generation exited
  with `AI_SERVICE_TOKEN is missing. Refusing to generate or store fake AI
  content.`
- Generated claim audit: PASS. Regenerated drafts after tightening validation;
  forbidden price, stock, delivery, warranty, safety, compliance, and discount
  pattern audit returned no matches.
- No-draft-publication check: PASS. Storefront product pages do not expose
  `aiDraft` or `reviewStatus` strings.
- Build/deploy: PASS. `services/product-service` and `services/frontend`
  builds passed; `./scripts/deploy.sh` completed and all FlipFlop workloads
  rolled out successfully.

## Changes Made

- `services/product-service/src/products/products.service.ts`: mapped catalog
  `seoData` and `tags` into FlipFlop product responses.
- `services/frontend/lib/api/products.ts`: added typed `ProductSeoData`.
- `services/frontend/app/products/[id]/page.tsx`: metadata generation now uses
  publishable catalog SEO fields and excludes draft SEO data.
- `scripts/generate-seo-drafts.js`: added approval-first AI draft generator.
- `k8s/external-secret.yaml`: maps `AI_SERVICE_TOKEN` from Vault to
  `flipflop-service-secret`.

## Intent Compliance Report

- Original intent preserved: priority products have AI SEO drafts; review state
  is recorded; SEO renders from publishable fields/fallback facts; drafts cannot
  silently publish.
- Constraints respected: no price changes, no stock changes, no checkout/order
  changes, no payment-provider work, free model tier requested, no fake AI
  content.
- Non-goals respected: no pricing automation, no supplier onboarding, no full
  marketing campaign automation.
- Remaining blockers: none for GOAL-04. Generated drafts still require human
  review before any publication into `seoData.meta*` fields.
- Next step: proceed to GOAL-05 operational closure.
