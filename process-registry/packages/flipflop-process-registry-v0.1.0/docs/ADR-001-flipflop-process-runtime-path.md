# ADR-001: FlipFlop Process Runtime Path

Status: Proposed

Date: 2026-07-06

## Context

FlipFlop needs a process-management path where business workflows can be visualized, reviewed, versioned, and edited separately from the application codebase. The first named process is `flipflop.successful_customer_journey.v1`; the decision should also leave room for suppliers, logistics, salary/payroll, delivery, and marketing processes.

The delivery chain must preserve:

```text
Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation
```

Current unavailable facts:

- [MISSING: approved FlipFlop process-owner role and approval authority]
- [MISSING: current FlipFlop checkout/service architecture and runtime language boundaries]
- [MISSING: production persistence, queue, and scheduler contracts for FlipFlop]
- [MISSING: approved budget/licensing preference for Camunda, Flowable, Temporal, or SaaS offerings]
- [UNKNOWN: whether FlipFlop needs long-running durable orchestration in the first release or only governed process-state lookup]

## Decision

Use a lightweight process registry first, not a full workflow engine as the first production runtime.

The first implementation should define `flipflop.successful_customer_journey.v1` as an approved, immutable process-definition artifact in a registry outside the checkout application code path. The application may read an approved active version and emit process events, but it must fail closed when the process definition is missing, invalid, unapproved, expired, or incompatible.

The registry must be deliberately migration-ready:

- Store process identity, semantic version, lifecycle state, owner, approver, approval timestamp, effective window, schema version, validation evidence, and rollback pointer.
- Keep process definitions serializable and diffable.
- Prefer BPMN-compatible naming and step semantics where possible, even if the first runtime is a simpler state/transition registry.
- Preserve references to IPS artifacts: Vision, Goal Impact, System, Feature, Task, Execution Plan, Coding Prompt, Code, and Validation.
- Treat n8n only as an integration sidecar for notifications, CRM, marketing, reporting, and external automation. Do not put checkout-critical orchestration authority in n8n.

Camunda 8 / Zeebe is the preferred later engine candidate if FlipFlop proves it needs business-authored BPMN execution, human-task orchestration, incident tooling, process-instance migration, and Git/CI-centered process governance. Camunda Web Modeler documents process applications, process-application version snapshots, Git sync, collaboration roles/comments, validation, and REST/API-based process lifecycle management.

Temporal is not the first fit for this stated problem because Temporal workflow definitions are code written with SDKs, not business-editable graphical process definitions. Temporal should remain a later option for specific long-running, retry-heavy, code-owned backend workflows.

Flowable remains a credible later BPMN/case-management candidate, especially if case management and broader low-code platform capabilities become central. It is not the first recommendation because the reviewed primary evidence showed less direct CI/Git review guidance than Camunda, and formal approval-gate mechanics remain [UNKNOWN: not confirmed from reviewed vendor docs].

## Tradeoff Table

| Option | Graphical editing | Versioning | Approval workflow | CI/scheduled validation support | Developer integration effort | Production safety | Separation from app code |
|---|---|---|---|---|---|---|---|
| Camunda 8 / Zeebe | Strong. Web Modeler supports BPMN/DMN/forms, collaboration, validation, process applications, and process landscape views. | Strong. Web Modeler process applications support snapshots; Git sync supports branch/repository workflows. Runtime process definitions are deployed separately. | Medium. Roles, comments, Git sync, PR/MR review, and CI governance are available, but a native formal approval workflow is [UNKNOWN: not confirmed as built-in]. | Strong. Camunda documents Web Modeler CI/CD integration, Git sync, model validation, deployment APIs, and orchestration APIs. Scheduled validation can be implemented by CI or polling, but event-driven scheduled validation is [UNKNOWN]. | Medium/high. Requires Zeebe cluster or SaaS, workers/connectors, deployment discipline, auth, observability, and model/runtime compatibility. | Strong. Provides process lifecycle APIs, incidents, user tasks, monitoring, migration concepts, and SemVer API guarantees for public APIs. | Strong. BPMN/DMN/form files can live as process applications and sync to Git separately from service code. |
| Temporal | Weak for this goal. Temporal workflows are code definitions; Web UI is operational, not a business model editor. | Strong for code-owned workflows via worker versioning, patching, replay, and deterministic constraints. | Weak/none for business-process approvals by default. Approval would live in Git/app governance. | Strong for workflow testing, replay, schedules, and durable execution validation, but code-centric. | High. Requires Temporal service/cloud, workers, task queues, SDK discipline, deterministic workflow rules, and versioning practice. | Very strong for durable, long-running, retry-heavy code orchestration. | Weak for business-owned process definitions because the definition is application code. |
| Flowable | Strong. Flowable Design supports browser-based BPMN/case/form/decision modeling. | Strong. Models and runtime definitions are versioned; apps can package models. | Medium/unknown. Roles and permissions exist; formal approval gates are [UNKNOWN: not confirmed from reviewed docs]. | Medium. Built-in model validation and REST APIs exist; Camunda-like CI/Git governance guidance was [UNKNOWN: not found in reviewed docs]. | Medium/high. Strong Java/Spring fit; non-Java service boundaries need REST/external-client design. | Strong. Flowable Control and admin capabilities support runtime visibility, failures, variables, migrations, and permissions. | Strong. Models can be grouped, exported/imported, published, and deployed separately from application code. |
| Lightweight registry first | Medium initially. Visualization can be generated from registry states or BPMN-like metadata; a full graphical editor is [MISSING: editor contract]. | Strong if designed as immutable approved versions with rollback pointers. | Strong if implemented as part of registry lifecycle: draft -> review -> approved -> active -> retired. | Strong for governance validation through schema checks, IPS trace checks, transition checks, scheduled CI, and runtime health probes. | Low/medium. Adds registry schema, admin/API surface, validator, runtime resolver, and audit log without adopting a new engine. | Medium. Safe for governed state lookup if fail-closed; not a replacement for durable workflow execution. | Strong by design. Definitions live outside app code; app code only consumes approved versions and emits events. |
| n8n sidecar only | Strong visual node editor for integrations and automation. | Medium. n8n documents Git-backed source control and environments on Business/Enterprise plans. | Medium/unknown. RBAC exists, but checkout-grade process approval semantics are [UNKNOWN]. | Medium. Good for scheduled/integration workflows; not proven as core checkout runtime validation. | Low for integrations; risky if made core orchestration authority. | Medium/low for checkout-critical orchestration because workflow editors can hold secrets and executable logic; hardening and permissions matter. | Medium. Good separation for side effects; poor fit as authoritative checkout process state. |

## Recommended First Step

Create a `process-registry` capability for `flipflop.successful_customer_journey.v1` with no external engine deployment.

Minimum first-step scope:

1. Define a process-definition schema with:
   - `process_key`
   - `version`
   - `status`
   - `owner`
   - `approver`
   - `approval_evidence`
   - `effective_from`
   - `effective_to`
   - `steps`
   - `allowed_transitions`
   - `events`
   - `guards`
   - `rollback_to`
   - `ips_trace`
   - `validation_evidence`
2. Define the lifecycle:
   - `draft`
   - `review`
   - `approved`
   - `active`
   - `retired`
   - `rejected`
3. Add validation gates:
   - schema validity
   - no unresolved `[MISSING: ...]` markers for active versions
   - all active definitions have owner and approver
   - every step maps to a known business event or task
   - every transition has a guard or explicit unconditional reason
   - every process version links to IPS chain artifacts
4. Add runtime behavior:
   - checkout/customer-journey code reads only `active` approved versions
   - runtime refuses unapproved or invalid versions
   - emitted events include process key, process version, transition, source entity, actor, timestamp, and validation result
5. Add visualization output:
   - generate Mermaid or BPMN-export-compatible diagrams from registry definitions
   - do not require business users to edit code to inspect the journey

## Later Migration Path

### Phase 1: Registry governance

The registry is the source of approved process definitions. Runtime behavior remains inside existing FlipFlop services. The registry provides audit, validation, visualization, and fail-closed active-version lookup.

Exit criteria:

- `flipflop.successful_customer_journey.v1` has an approved active definition.
- CI validates schema, IPS traceability, lifecycle, and transition safety.
- A scheduled validation job reports active process health.
- Checkout/customer-journey code refuses missing/unapproved process definitions.

### Phase 2: BPMN compatibility

Add import/export to BPMN 2.0 or a BPMN-compatible subset. Keep the registry as the governance source and make BPMN artifacts generated, imported, or round-tripped only after validation.

Exit criteria:

- A generated diagram can represent the full successful customer journey.
- Business review can happen on diagram changes.
- Diff and approval evidence are attached to each active version.

### Phase 3: Camunda 8 / Zeebe pilot

Pilot Camunda with one non-checkout-critical process or a shadow version of `flipflop.successful_customer_journey.v1`. Use Camunda Web Modeler/Git sync/CI for model governance and Zeebe workers for controlled service interactions.

Exit criteria:

- Clear worker ownership model.
- Production auth and secret handling defined.
- Incident handling and rollback runbook defined.
- Process-instance migration behavior tested.
- Runtime evidence proves value beyond registry-driven state governance.

### Phase 4: Engine adoption decision

Adopt Camunda for selected processes only if the pilot shows enough value in graphical editing, human tasks, incident operations, and cross-service orchestration. Keep Temporal available for code-owned durable workflows where graphical business editing is not required.

## Non-Goals

- Do not deploy, install, or operate Camunda, Temporal, Flowable, or n8n as part of this ADR.
- Do not move checkout-critical orchestration to n8n.
- Do not implement a general-purpose workflow engine in the registry.
- Do not invent approval authority; unresolved authority must remain `[MISSING: ...]`.
- Do not replace service-level idempotency, payment safety, inventory safety, or data consistency controls with process diagrams.
- Do not let business-editable process definitions execute arbitrary code.
- Do not allow active runtime definitions without validation evidence.

## Risks

- Registry-first can drift into a custom workflow engine if scope is not capped to governance, validation, visualization, and fail-closed lookup.
- If FlipFlop already requires durable long-running orchestration, registry-only execution may be insufficient; this remains [UNKNOWN: runtime durability requirement].
- Camunda/Flowable adoption later can require model migration, worker redesign, operational ownership, and licensing decisions.
- Temporal would create a strong backend orchestration platform but may fail the business-editable graphical process goal if chosen too early.
- Approval workflow semantics are not yet defined by an approved business owner.
- Generated diagrams can create false confidence unless CI validates transition reachability, guards, and runtime event mapping.
- n8n sidecar automations can become shadow process authority if integration workflows mutate checkout state directly.

## Parallel Execution Plan

Ready now:

| Workstream | Owner role | Scope | Allowed files/contracts | Forbidden files/contracts | Expected output | Dependencies | Validation owner | Merge/order |
|---|---|---|---|---|---|---|---|---|
| Process schema | Backend/platform agent | Define registry schema, lifecycle states, validation markers, and active-version invariants. | New process-registry schema/docs/tests. | Checkout behavior changes. | Schema draft and validator contract. | None. | Architecture owner. | First. |
| IPS trace package | Documentation/governance agent | Map `flipflop.successful_customer_journey.v1` to Vision -> Validation chain. | IPS docs, ADR references, process metadata. | Runtime code. | Traceability packet with `[MISSING: ...]` blockers. | None. | Governance owner. | First. |
| Journey modeling | Product/process agent | Draft first successful customer journey states, events, guards, and Mermaid/BPMN-compatible view. | Process definition draft and diagram artifact. | Runtime code and engine selection. | Reviewable process draft. | Process-owner input may be needed. | Product owner. | After schema contract. |

Dependency-gated:

| Workstream | Owner role | Scope | Blocker | Expected output |
|---|---|---|---|---|
| Runtime resolver | Backend agent | Read active approved process version and fail closed. | Requires schema and persistence contract. | Resolver API and tests. |
| Scheduled validation | QA/platform agent | CI/cron validation of active process definitions. | Requires schema and storage location. | Validation report and failing examples. |
| Camunda pilot packet | Architecture agent | Prepare Camunda pilot criteria and worker boundary. | Requires registry Phase 1 evidence and licensing/runtime decision. | Pilot execution plan, not deployment. |

Final integration:

- Integration owner: architecture/platform owner.
- Validation owner: governance/QA owner.
- Merge order: schema -> IPS trace -> journey draft -> runtime resolver -> scheduled validation -> Camunda pilot packet.
- Shared contracts: process schema, lifecycle states, approval evidence, runtime event envelope, validation report format.

## Consequences

Positive:

- Fastest safe path to externalized process governance.
- Keeps checkout production safety under existing service controls.
- Avoids premature engine operations before process ownership and approval rules exist.
- Keeps Camunda migration practical by preserving BPMN-compatible process semantics.
- Keeps Temporal available for code-owned durable workflows instead of forcing it into a business-modeling role.

Negative:

- Graphical editing is not complete on day one unless a generated diagram or editor is added.
- The team must enforce registry scope to avoid building a weak workflow engine.
- Runtime durability remains limited to existing application patterns until an engine is adopted.
- Formal process approval roles are still [MISSING: approved authority].

## Validation

This ADR was validated against the requested options and current public documentation as of 2026-07-06:

- Camunda process applications, versioning, Git sync, collaboration, validation, and Orchestration Cluster API:
  - https://docs.camunda.io/docs/components/modeler/web-modeler/process-applications/
  - https://docs.camunda.io/docs/components/modeler/web-modeler/process-applications/git-sync/
  - https://docs.camunda.io/docs/components/modeler/web-modeler/collaboration/
  - https://docs.camunda.io/docs/apis-tools/orchestration-cluster-api-rest/orchestration-cluster-api-rest-overview/
- Temporal workflow definitions, determinism, workers, and workflow execution:
  - https://docs.temporal.io/workflow-definition
  - https://docs.temporal.io/workers
  - https://docs.temporal.io/workflow-execution
  - https://docs.temporal.io/develop/java/workflows/versioning
- Flowable open-source engine/product positioning:
  - https://www.flowable.com/open-source
- n8n source control/environments and queue mode:
  - https://docs.n8n.io/source-control-environments/
  - https://docs.n8n.io/hosting/scaling/queue-mode/
- Intent Preservation System local standard:
  - `/Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system/README.md`
  - `/Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system/18_templates/ADR_TEMPLATE.md`
  - `/Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system/23_documentation_contracts/AGENT_GAP_FILLING_RULES.md`

Validation result:

- Recommendation includes all requested options.
- Tradeoff table includes graphical editing, versioning, approval workflow, CI/scheduled validation support, developer integration effort, production safety, and separation from app code.
- First step and later migration path are explicit.
- Non-goals and risks are explicit.
- Unavailable facts are marked with `[MISSING: ...]` or `[UNKNOWN: ...]`.
- No deployment or installation was performed.
