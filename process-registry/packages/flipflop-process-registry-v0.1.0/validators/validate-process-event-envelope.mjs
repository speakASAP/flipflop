#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const IDENT = /^[a-z][a-z0-9_]*$/;
const PROCESS_KEY = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/;
const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const DECISIONS = new Set(["accepted", "rejected", "blocked"]);
const ACTORS = new Set(["customer", "staff", "system", "integration"]);

function parseArgs(argv) {
  const args = { file: null, expect: null, report: null };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--expect") {
      args.expect = argv[++i];
    } else if (value === "--report") {
      args.report = argv[++i];
    } else if (!args.file) {
      args.file = value;
    } else {
      throw new Error(`Unexpected argument: ${value}`);
    }
  }
  if (!args.file) throw new Error("Usage: node validate-process-event-envelope.mjs <event.json> [--expect pass|fail] [--report report.json]");
  if (args.expect && !["pass", "fail"].includes(args.expect)) throw new Error("--expect must be pass or fail");
  return args;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function add(errors, code, message, pathValue = "$") {
  errors.push({ code, path: pathValue, message });
}

function validateEnvelope(envelope) {
  const errors = [];
  if (!isObject(envelope)) {
    add(errors, "envelope.object", "event envelope must be an object");
    return { valid: false, errors, warnings: [] };
  }
  for (const key of ["event_id", "occurred_at", "process_key", "process_version", "transition", "source_entity", "actor", "validation_result", "payload"]) {
    if (!(key in envelope)) add(errors, "top.required", `missing required field ${key}`, `$.${key}`);
  }
  if (typeof envelope.event_id !== "string" || envelope.event_id.length === 0) add(errors, "event_id.required", "event_id is required", "$.event_id");
  if (typeof envelope.occurred_at !== "string" || !DATE_TIME.test(envelope.occurred_at)) add(errors, "occurred_at.date_time", "occurred_at must be UTC date-time", "$.occurred_at");
  if (typeof envelope.process_key !== "string" || !PROCESS_KEY.test(envelope.process_key)) add(errors, "process_key.pattern", "process_key must be lowercase dotted notation", "$.process_key");
  if (typeof envelope.process_version !== "string" || !SEMVER.test(envelope.process_version)) add(errors, "process_version.semver", "process_version must use MAJOR.MINOR.PATCH", "$.process_version");

  if (!isObject(envelope.transition)) {
    add(errors, "transition.object", "transition must be an object", "$.transition");
  } else {
    for (const key of ["from_step", "to_step", "event"]) {
      if (typeof envelope.transition[key] !== "string" || !IDENT.test(envelope.transition[key])) {
        add(errors, "transition.identifier", `${key} must be lower snake identifier`, `$.transition.${key}`);
      }
    }
  }

  if (!isObject(envelope.source_entity)) {
    add(errors, "source_entity.object", "source_entity must be an object", "$.source_entity");
  } else {
    if (typeof envelope.source_entity.type !== "string" || envelope.source_entity.type.length === 0) add(errors, "source_entity.type", "source_entity.type is required", "$.source_entity.type");
    if (typeof envelope.source_entity.id !== "string" || envelope.source_entity.id.length === 0) add(errors, "source_entity.id", "source_entity.id is required", "$.source_entity.id");
  }

  if (!isObject(envelope.actor)) {
    add(errors, "actor.object", "actor must be an object", "$.actor");
  } else {
    if (!ACTORS.has(envelope.actor.type)) add(errors, "actor.type", `actor type ${envelope.actor.type} is not allowed`, "$.actor.type");
    if (typeof envelope.actor.id !== "string" || envelope.actor.id.length === 0) add(errors, "actor.id", "actor.id is required", "$.actor.id");
  }

  if (!isObject(envelope.validation_result)) {
    add(errors, "validation_result.object", "validation_result must be an object", "$.validation_result");
  } else {
    const decision = envelope.validation_result.decision;
    if (!DECISIONS.has(decision)) add(errors, "validation_result.decision", `decision ${decision} is not allowed`, "$.validation_result.decision");
    const refs = envelope.validation_result.rule_refs;
    if (!Array.isArray(refs) || refs.length === 0 || refs.some((ref) => typeof ref !== "string" || ref.length === 0)) {
      add(errors, "validation_result.rule_refs", "rule_refs must contain at least one non-empty string", "$.validation_result.rule_refs");
    }
    if (["rejected", "blocked"].includes(decision) && (typeof envelope.validation_result.reason !== "string" || envelope.validation_result.reason.length === 0)) {
      add(errors, "validation_result.reason", "rejected or blocked decisions require a machine-actionable reason", "$.validation_result.reason");
    }
  }

  if (!isObject(envelope.payload)) add(errors, "payload.object", "payload must be an object", "$.payload");

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    summary: {
      event_id: envelope.event_id,
      process_key: envelope.process_key,
      process_version: envelope.process_version,
      decision: envelope.validation_result?.decision || null
    }
  };
}

function main() {
  const args = parseArgs(process.argv);
  const envelope = JSON.parse(fs.readFileSync(args.file, "utf8"));
  const result = validateEnvelope(envelope);
  const report = {
    validator: "process-event-envelope-validator.v1",
    generated_at: new Date().toISOString(),
    file: path.resolve(args.file),
    expected: args.expect || null,
    actual: result.valid ? "pass" : "fail",
    ...result
  };
  if (args.report) fs.writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (args.expect && args.expect !== report.actual) {
    process.exitCode = 2;
  } else if (!args.expect && !result.valid) {
    process.exitCode = 1;
  }
}

main();
