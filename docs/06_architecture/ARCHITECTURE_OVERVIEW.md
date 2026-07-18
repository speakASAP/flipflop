# FlipFlop Architecture Overview

```yaml
id: FF-ARCHITECTURE
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../SYSTEM.md
  - ../SPEC.md
downstream:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Overview

FlipFlop uses NestJS services, a Next.js SSR frontend, PostgreSQL, Redis, Kubernetes, Vault, External Secrets Operator, and shared ecosystem services for auth, catalog, warehouse, orders, payments, notifications, logging, and AI.

## Intent Preservation Architecture

The IPS layer adds immutable intent, task traceability, gate scripts, validation evidence, and graph relationships around the existing implementation-goal workflow.

## Validation

Architecture-impacting changes require ADR updates, invariant review, goal validation, and implementation-state updates.

