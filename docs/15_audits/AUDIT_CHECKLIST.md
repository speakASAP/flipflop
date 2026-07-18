# FlipFlop Audit Checklist

```yaml
id: FF-AUDIT-CHECKLIST
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../23_documentation_contracts/DOCUMENTATION_COMPLETENESS_STANDARD.md
downstream:
  - ../docs/IMPLEMENTATION_STATE.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Checklist

- Immutable intent documents exist and are not weakened.
- Tasks link to feature, goal impact, and execution plan.
- Execution plans include validation, protected files, and rollback.
- Sensitive data is absent from prompts, docs, logs, reports, and commits.
- Payment-provider and webhook risks are not marked verified without evidence.
- Goal closure includes validation evidence and an intent compliance report.

