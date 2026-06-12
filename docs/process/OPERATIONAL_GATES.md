# Operational Gates

Use the narrowest relevant gate for the selected goal.

## IPS Gates

Required before coding:

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
```

Required before deployment or release closure:

```bash
python3 scripts/deployment_readiness_gate.py --root .
```

## Documentation Gate

Required for documentation-only goals:

```bash
find docs implementation-goals -name '*.md' -print
git diff -- docs implementation-goals AGENTS.md README.md SYSTEM.md
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
```

Pass criteria:

- new files are discoverable;
- links and filenames are consistent;
- implementation state identifies the next step;
- intent, constraints, non-goals, and validation expectations are recorded.

## Intent Gate

Required before coding:

- original intent is available in `docs/INTENT_MEMORY.md`;
- selected goal has constraints, non-goals, and acceptance criteria;
- execution plan exists;
- blockers are explicit;
- unresolved `[MISSING: ...]` markers block execution.

## Code Gate

Required after code edits:

```bash
npm run build
npm test
```

If a narrower package-level command exists for the touched service, use it first and document why broader validation was or was not run.

## Deployment Gate

Required before production rollout:

```bash
./scripts/deploy.sh
```

Pass criteria:

- Kubernetes rollout succeeds;
- `/health` succeeds;
- smoke checks pass for homepage, product API, auth, cart, checkout, and stock paths relevant to the goal.

## Payment Gate

Required before marking checkout revenue complete:

- PayU initiation and webhook confirmation verified or blocked by credentials.
- PayPal initiation and webhook confirmation verified or blocked by credentials.
- GP WebPay initiation and webhook confirmation verified with FlipFlop application description.
- Stripe initiation and webhook confirmation verified.
- Order state, stock update, and notification evidence recorded per provider.
- Owner-bypassed provider or webhook gaps remain visible and must not be marked verified automatically.
