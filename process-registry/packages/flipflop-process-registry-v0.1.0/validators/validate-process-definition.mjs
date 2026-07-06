#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const IDENT = /^[a-z][a-z0-9_]*$/;
const PROCESS_KEY = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/;
const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const MARKER = /\[(MISSING|UNKNOWN):[^\]]+\]/;
const STATUSES = new Set(["draft", "review", "approved", "active", "retired", "rejected"]);
const STEP_TYPES = new Set(["start", "task", "service_task", "human_task", "gateway", "event", "end"]);
const ACTOR_TYPES = new Set(["person", "team", "system", "missing"]);
const TRACE_STATUSES = new Set(["linked", "missing", "unknown"]);
const EVIDENCE_KINDS = new Set(["approval", "ci", "scheduled_validation", "manual_review", "runtime_probe", "missing"]);
const EVIDENCE_RESULTS = new Set(["pass", "fail", "blocked", "missing", "unknown"]);
const GUARD_TYPES = new Set(["condition", "approval", "unconditional", "missing"]);
const REQUIRED_TOP_LEVEL = [
  "schema_version",
  "process_key",
  "version",
  "status",
  "title",
  "owner",
  "approver",
  "approval_evidence",
  "approval_timestamp",
  "effective_from",
  "effective_to",
  "rollback_to",
  "ips_trace",
  "steps",
  "events",
  "guards",
  "allowed_transitions",
  "validation_evidence",
  "runtime_invariants"
];
const REQUIRED_TRACE = [
  "vision",
  "goal_impact",
  "system",
  "feature",
  "task",
  "execution_plan",
  "coding_prompt",
  "code",
  "validation"
];

function parseArgs(argv) {
  const args = {
    file: null,
    expect: null,
    report: null,
    now: "2026-07-06T00:00:00Z",
    requireRuntimeReady: false
  };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--expect") {
      args.expect = argv[++i];
    } else if (value === "--report") {
      args.report = argv[++i];
    } else if (value === "--now") {
      args.now = argv[++i];
    } else if (value === "--require-runtime-ready") {
      args.requireRuntimeReady = true;
    } else if (!args.file) {
      args.file = value;
    } else {
      throw new Error(`Unexpected argument: ${value}`);
    }
  }
  if (!args.file) {
    throw new Error("Usage: node validate-process-definition.mjs <definition.json> [--expect pass|fail] [--report report.json] [--require-runtime-ready]");
  }
  if (args.expect && !["pass", "fail"].includes(args.expect)) {
    throw new Error("--expect must be pass or fail");
  }
  return args;
}

function add(errors, code, message, pathValue = "$") {
  errors.push({ code, path: pathValue, message });
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasMarker(value) {
  return MARKER.test(JSON.stringify(value));
}

function validateActor(actor, errors, pathValue) {
  if (!isObject(actor)) {
    add(errors, "actor.object", "actor must be an object", pathValue);
    return;
  }
  for (const key of ["type", "id", "display_name"]) {
    if (typeof actor[key] !== "string" || actor[key].length === 0) {
      add(errors, "actor.required", `${key} must be a non-empty string`, `${pathValue}.${key}`);
    }
  }
  if (typeof actor.type === "string" && !ACTOR_TYPES.has(actor.type)) {
    add(errors, "actor.type", `actor type ${actor.type} is not allowed`, `${pathValue}.type`);
  }
}

function validateEvidence(evidence, errors, pathValue) {
  if (!isObject(evidence)) {
    add(errors, "evidence.object", "evidence must be an object", pathValue);
    return;
  }
  for (const key of ["kind", "ref", "result", "recorded_at"]) {
    if (typeof evidence[key] !== "string" || evidence[key].length === 0) {
      add(errors, "evidence.required", `${key} must be a non-empty string`, `${pathValue}.${key}`);
    }
  }
  if (typeof evidence.kind === "string" && !EVIDENCE_KINDS.has(evidence.kind)) {
    add(errors, "evidence.kind", `evidence kind ${evidence.kind} is not allowed`, `${pathValue}.kind`);
  }
  if (typeof evidence.result === "string" && !EVIDENCE_RESULTS.has(evidence.result)) {
    add(errors, "evidence.result", `evidence result ${evidence.result} is not allowed`, `${pathValue}.result`);
  }
  if (typeof evidence.recorded_at === "string" && !DATE_TIME.test(evidence.recorded_at)) {
    add(errors, "evidence.recorded_at", "recorded_at must be UTC date-time", `${pathValue}.recorded_at`);
  }
}

function validateTrace(trace, errors) {
  if (!isObject(trace)) {
    add(errors, "trace.object", "ips_trace must be an object", "$.ips_trace");
    return;
  }
  for (const key of REQUIRED_TRACE) {
    const value = trace[key];
    if (!isObject(value)) {
      add(errors, "trace.required", `missing trace entry ${key}`, `$.ips_trace.${key}`);
      continue;
    }
    if (typeof value.ref !== "string" || value.ref.length === 0) {
      add(errors, "trace.ref", "trace ref must be non-empty", `$.ips_trace.${key}.ref`);
    }
    if (!TRACE_STATUSES.has(value.status)) {
      add(errors, "trace.status", `trace status ${value.status} is not allowed`, `$.ips_trace.${key}.status`);
    }
  }
}

function duplicateIds(items, idKey) {
  const seen = new Set();
  const dupes = new Set();
  for (const item of items) {
    const id = item?.[idKey];
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}

function validateDefinition(definition, options = {}) {
  const errors = [];
  const warnings = [];
  if (!isObject(definition)) {
    add(errors, "definition.object", "process definition must be a JSON object");
    return { valid: false, errors, warnings };
  }

  for (const key of REQUIRED_TOP_LEVEL) {
    if (!(key in definition)) add(errors, "top.required", `missing required top-level field ${key}`, `$.${key}`);
  }
  if (definition.schema_version !== "process-definition.v1") {
    add(errors, "schema_version.const", "schema_version must be process-definition.v1", "$.schema_version");
  }
  if (typeof definition.process_key !== "string" || !PROCESS_KEY.test(definition.process_key)) {
    add(errors, "process_key.pattern", "process_key must be lowercase dotted notation", "$.process_key");
  }
  if (typeof definition.version !== "string" || !SEMVER.test(definition.version)) {
    add(errors, "version.semver", "version must use MAJOR.MINOR.PATCH", "$.version");
  }
  if (!STATUSES.has(definition.status)) {
    add(errors, "status.enum", `status ${definition.status} is not allowed`, "$.status");
  }
  if (typeof definition.title !== "string" || definition.title.length === 0) {
    add(errors, "title.required", "title must be a non-empty string", "$.title");
  }

  validateActor(definition.owner, errors, "$.owner");
  validateTrace(definition.ips_trace, errors);
  if (definition.approver !== null && definition.approver !== undefined) {
    validateActor(definition.approver, errors, "$.approver");
  }
  if (definition.approval_evidence !== null && definition.approval_evidence !== undefined) {
    validateEvidence(definition.approval_evidence, errors, "$.approval_evidence");
  }

  for (const field of ["approval_timestamp", "effective_from", "effective_to"]) {
    const value = definition[field];
    if (value !== null && value !== undefined && (typeof value !== "string" || !DATE_TIME.test(value))) {
      add(errors, `${field}.date_time`, `${field} must be null or UTC date-time`, `$.${field}`);
    }
  }

  const steps = Array.isArray(definition.steps) ? definition.steps : [];
  const events = Array.isArray(definition.events) ? definition.events : [];
  const guards = Array.isArray(definition.guards) ? definition.guards : [];
  const transitions = Array.isArray(definition.allowed_transitions) ? definition.allowed_transitions : [];
  const evidence = Array.isArray(definition.validation_evidence) ? definition.validation_evidence : [];

  if (steps.length < 2) add(errors, "steps.min", "steps must contain at least two entries", "$.steps");
  if (events.length < 1) add(errors, "events.min", "events must contain at least one entry", "$.events");
  if (guards.length < 1) add(errors, "guards.min", "guards must contain at least one entry", "$.guards");
  if (transitions.length < 1) add(errors, "transitions.min", "allowed_transitions must contain at least one entry", "$.allowed_transitions");

  const stepIds = new Set();
  const eventKeys = new Set();
  const guardIds = new Set();

  for (const id of duplicateIds(steps, "id")) add(errors, "steps.duplicate", `duplicate step id ${id}`, "$.steps");
  for (const id of duplicateIds(events, "key")) add(errors, "events.duplicate", `duplicate event key ${id}`, "$.events");
  for (const id of duplicateIds(guards, "id")) add(errors, "guards.duplicate", `duplicate guard id ${id}`, "$.guards");

  steps.forEach((step, index) => {
    const pathValue = `$.steps[${index}]`;
    if (!isObject(step)) return add(errors, "step.object", "step must be an object", pathValue);
    if (typeof step.id !== "string" || !IDENT.test(step.id)) add(errors, "step.id", "step id must be lower snake identifier", `${pathValue}.id`);
    if (typeof step.id === "string") stepIds.add(step.id);
    if (typeof step.name !== "string" || step.name.length === 0) add(errors, "step.name", "step name is required", `${pathValue}.name`);
    if (!STEP_TYPES.has(step.type)) add(errors, "step.type", `step type ${step.type} is not allowed`, `${pathValue}.type`);
    validateActor(step.owner, errors, `${pathValue}.owner`);
    for (const eventKey of step.emits_events || []) {
      if (typeof eventKey !== "string" || !IDENT.test(eventKey)) {
        add(errors, "step.emits_events.identifier", "emitted event must be an identifier", `${pathValue}.emits_events`);
      }
    }
  });

  events.forEach((event, index) => {
    const pathValue = `$.events[${index}]`;
    if (!isObject(event)) return add(errors, "event.object", "event must be an object", pathValue);
    if (typeof event.key !== "string" || !IDENT.test(event.key)) add(errors, "event.key", "event key must be lower snake identifier", `${pathValue}.key`);
    if (typeof event.key === "string") eventKeys.add(event.key);
    if (typeof event.name !== "string" || event.name.length === 0) add(errors, "event.name", "event name is required", `${pathValue}.name`);
    if (typeof event.source !== "string" || event.source.length === 0) add(errors, "event.source", "event source is required", `${pathValue}.source`);
    if (typeof event.payload_contract !== "string" || event.payload_contract.length === 0) {
      add(errors, "event.payload_contract", "event payload_contract is required", `${pathValue}.payload_contract`);
    }
    if (["approved", "active"].includes(definition.status) && (MARKER.test(event.source || "") || MARKER.test(event.payload_contract || ""))) {
      add(errors, "event.unresolved", "approved or active event source and payload_contract must be resolved", pathValue);
    }
  });

  guards.forEach((guard, index) => {
    const pathValue = `$.guards[${index}]`;
    if (!isObject(guard)) return add(errors, "guard.object", "guard must be an object", pathValue);
    if (typeof guard.id !== "string" || !IDENT.test(guard.id)) add(errors, "guard.id", "guard id must be lower snake identifier", `${pathValue}.id`);
    if (typeof guard.id === "string") guardIds.add(guard.id);
    if (!GUARD_TYPES.has(guard.type)) add(errors, "guard.type", `guard type ${guard.type} is not allowed`, `${pathValue}.type`);
    if (["approved", "active"].includes(definition.status) && guard.type === "missing") {
      add(errors, "guard.missing", "approved or active guard type must not be missing", pathValue);
    }
    if (typeof guard.expression !== "string" || guard.expression.length === 0) add(errors, "guard.expression", "guard expression is required", `${pathValue}.expression`);
    if (typeof guard.reason !== "string" || guard.reason.length === 0) add(errors, "guard.reason", "guard reason is required", `${pathValue}.reason`);
    if (/=>|function\s|\beval\s*\(|\bnew Function\b/.test(guard.expression || "")) {
      add(errors, "guard.executable", "guard expression must be declarative and not executable JavaScript", `${pathValue}.expression`);
    }
  });

  const outgoing = new Map();
  const incoming = new Map();
  transitions.forEach((transition, index) => {
    const pathValue = `$.allowed_transitions[${index}]`;
    if (!isObject(transition)) return add(errors, "transition.object", "transition must be an object", pathValue);
    for (const key of ["from_step", "to_step", "event", "guard_ref"]) {
      if (typeof transition[key] !== "string" || !IDENT.test(transition[key])) {
        add(errors, "transition.identifier", `${key} must be lower snake identifier`, `${pathValue}.${key}`);
      }
    }
    if (!stepIds.has(transition.from_step)) add(errors, "transition.from_step", `missing from_step ${transition.from_step}`, `${pathValue}.from_step`);
    if (!stepIds.has(transition.to_step)) add(errors, "transition.to_step", `missing to_step ${transition.to_step}`, `${pathValue}.to_step`);
    if (!eventKeys.has(transition.event)) add(errors, "transition.event", `missing event ${transition.event}`, `${pathValue}.event`);
    if (!guardIds.has(transition.guard_ref)) {
      add(errors, "transition.guard_ref", `missing guard_ref ${transition.guard_ref}`, `${pathValue}.guard_ref`);
    } else {
      const declaredGuard = guards.find((guard) => guard.id === transition.guard_ref);
      const comparableDeclaredGuard = declaredGuard && {
        type: declaredGuard.type,
        expression: declaredGuard.expression,
        reason: declaredGuard.reason
      };
      if (JSON.stringify(comparableDeclaredGuard) !== JSON.stringify(transition.guard)) {
        add(errors, "transition.guard.mismatch", `embedded guard does not match declared guard ${transition.guard_ref}`, `${pathValue}.guard`);
      }
    }
    if (["approved", "active"].includes(definition.status) && transition.guard?.type === "missing") {
      add(errors, "transition.guard.missing", "approved or active transition guard must not be missing", `${pathValue}.guard`);
    }
    outgoing.set(transition.from_step, [...(outgoing.get(transition.from_step) || []), transition.to_step]);
    incoming.set(transition.to_step, [...(incoming.get(transition.to_step) || []), transition.from_step]);
  });

  for (const step of steps) {
    if (step.type !== "end" && !outgoing.has(step.id)) {
      add(errors, "graph.outgoing", `non-end step ${step.id} has no outgoing transition`, "$.allowed_transitions");
    }
    if (step.type !== "start" && !incoming.has(step.id)) {
      add(errors, "graph.incoming", `non-start step ${step.id} has no incoming transition`, "$.allowed_transitions");
    }
    for (const eventKey of step.emits_events || []) {
      if (!eventKeys.has(eventKey)) add(errors, "step.emits_events.missing", `step ${step.id} emits undeclared event ${eventKey}`, "$.steps");
    }
  }

  const startSteps = steps.filter((step) => step.type === "start").map((step) => step.id);
  const endSteps = steps.filter((step) => step.type === "end").map((step) => step.id);
  if (startSteps.length === 0) add(errors, "graph.start", "definition must contain at least one start step", "$.steps");
  if (endSteps.length === 0) add(errors, "graph.end", "definition must contain at least one end step", "$.steps");
  const reachable = new Set(startSteps);
  const queue = [...startSteps];
  while (queue.length) {
    const current = queue.shift();
    for (const next of outgoing.get(current) || []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }
  for (const step of steps) {
    if (step.type !== "start" && !reachable.has(step.id)) {
      add(errors, "graph.reachable", `step ${step.id} is not reachable from a start step`, "$.steps");
    }
  }

  evidence.forEach((item, index) => validateEvidence(item, errors, `$.validation_evidence[${index}]`));
  const hasPassingEvidence = evidence.some((item) => item?.result === "pass");

  if (definition.status === "approved" && hasMarker(definition)) {
    add(errors, "approved.markers", "approved definitions must contain no unresolved markers");
  }
  if (definition.status === "active") {
    if (hasMarker(definition)) add(errors, "active.markers", "active definitions must contain no unresolved markers");
    if (definition.owner?.type === "missing") add(errors, "active.owner", "active definition owner must not be missing", "$.owner");
    if (!definition.approver || definition.approver?.type === "missing") add(errors, "active.approver", "active definition approver is required", "$.approver");
    if (!definition.approval_evidence || definition.approval_evidence?.result !== "pass") {
      add(errors, "active.approval_evidence", "active definition requires passing approval evidence", "$.approval_evidence");
    }
    if (!definition.approval_timestamp) add(errors, "active.approval_timestamp", "active definition requires approval_timestamp", "$.approval_timestamp");
    if (!definition.effective_from) add(errors, "active.effective_from", "active definition requires effective_from", "$.effective_from");
    if (!hasPassingEvidence) add(errors, "active.validation_evidence", "active definition requires at least one passing validation evidence record", "$.validation_evidence");
    for (const key of REQUIRED_TRACE) {
      if (definition.ips_trace?.[key]?.status !== "linked") {
        add(errors, "active.ips_trace", `active definition trace ${key} must be linked`, `$.ips_trace.${key}`);
      }
    }
  }

  const now = new Date(options.now || new Date().toISOString());
  if (definition.status === "active" && definition.effective_from && new Date(definition.effective_from) > now) {
    add(errors, "active.effective_window", "active definition effective_from is in the future", "$.effective_from");
  }
  if (definition.status === "active" && definition.effective_to && new Date(definition.effective_to) < now) {
    add(errors, "active.effective_window", "active definition is expired", "$.effective_to");
  }
  if (options.requireRuntimeReady && definition.status !== "active") {
    add(errors, "runtime_ready.status", "runtime-ready validation requires status=active", "$.status");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      process_key: definition.process_key,
      version: definition.version,
      status: definition.status,
      steps: steps.length,
      events: events.length,
      guards: guards.length,
      transitions: transitions.length,
      unresolved_marker_count: (JSON.stringify(definition).match(/\[(?:MISSING|UNKNOWN):/g) || []).length
    }
  };
}

function main() {
  const args = parseArgs(process.argv);
  const source = fs.readFileSync(args.file, "utf8");
  const definition = JSON.parse(source);
  const result = validateDefinition(definition, { now: args.now, requireRuntimeReady: args.requireRuntimeReady });
  const report = {
    validator: "process-definition-validator.v1",
    generated_at: new Date().toISOString(),
    file: path.resolve(args.file),
    expected: args.expect || null,
    require_runtime_ready: args.requireRuntimeReady,
    actual: result.valid ? "pass" : "fail",
    ...result
  };
  if (args.report) {
    fs.writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  if (args.expect && args.expect !== report.actual) {
    process.exitCode = 2;
  } else if (!args.expect && !result.valid) {
    process.exitCode = 1;
  }
}

main();
