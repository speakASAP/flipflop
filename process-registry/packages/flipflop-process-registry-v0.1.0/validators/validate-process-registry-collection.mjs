#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const PROCESS_KEY = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/;
const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const STATUSES = new Set(["draft", "review", "approved", "active", "retired", "rejected"]);
const ROLES = new Set(["viewer", "modeler", "reviewer", "approver", "publisher", "runtime_reader", "auditor", "admin"]);
const LIFECYCLE_ROLES = new Set(["modeler", "reviewer", "approver", "publisher", "admin"]);

function parseArgs(argv) {
  const args = { file: null, expect: null, report: null, processKey: null, now: "2026-07-06T00:00:00Z" };
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--expect") args.expect = argv[++i];
    else if (value === "--report") args.report = argv[++i];
    else if (value === "--process-key") args.processKey = argv[++i];
    else if (value === "--now") args.now = argv[++i];
    else if (!args.file) args.file = value;
    else throw new Error(`Unexpected argument: ${value}`);
  }
  if (!args.file) throw new Error("Usage: node validate-process-registry-collection.mjs <collection.json> [--expect pass|fail] [--report report.json] [--process-key key] [--now date-time]");
  if (args.expect && !["pass", "fail"].includes(args.expect)) throw new Error("--expect must be pass or fail");
  return args;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function add(errors, code, message, pathValue = "$") {
  errors.push({ code, path: pathValue, message });
}

function resolveLocalRef(collectionPath, ref) {
  if (ref.startsWith("file://")) return path.resolve(path.dirname(collectionPath), ref.slice("file://".length));
  if (ref.startsWith("fixture://")) return null;
  return path.resolve(path.dirname(collectionPath), ref);
}

function validateActor(actor, errors, pathValue) {
  if (!isObject(actor)) return add(errors, "actor.object", "actor must be an object", pathValue);
  if (!["person", "team", "system", "missing"].includes(actor.type)) add(errors, "actor.type", `actor type ${actor.type} is not allowed`, `${pathValue}.type`);
  if (typeof actor.id !== "string" || actor.id.length === 0) add(errors, "actor.id", "actor id is required", `${pathValue}.id`);
}

function isCurrentlyEffective(record, now) {
  if (record.status !== "active") return false;
  const current = new Date(now);
  if (record.effective_from && new Date(record.effective_from) > current) return false;
  if (record.effective_to && new Date(record.effective_to) < current) return false;
  return true;
}

function validateCollection(collection, collectionPath, options = {}) {
  const errors = [];
  const warnings = [];
  if (!isObject(collection)) {
    add(errors, "collection.object", "collection must be an object");
    return { valid: false, errors, warnings };
  }
  for (const key of ["schema_version", "registry_key", "storage_model", "access_control", "definitions"]) {
    if (!(key in collection)) add(errors, "top.required", `missing required field ${key}`, `$.${key}`);
  }
  if (collection.schema_version !== "process-registry-collection.v1") {
    add(errors, "schema_version.const", "schema_version must be process-registry-collection.v1", "$.schema_version");
  }
  if (typeof collection.registry_key !== "string" || !PROCESS_KEY.test(collection.registry_key)) {
    add(errors, "registry_key.pattern", "registry_key must be lowercase dotted notation", "$.registry_key");
  }

  const storage = collection.storage_model;
  if (!isObject(storage)) {
    add(errors, "storage.object", "storage_model must be an object", "$.storage_model");
  } else {
    if (storage.source_of_truth !== "git") add(errors, "storage.source_of_truth", "source_of_truth must be git for this lane", "$.storage_model.source_of_truth");
    if (!["none", "database", "object_store", "service_read_model"].includes(storage.runtime_projection)) {
      add(errors, "storage.runtime_projection", "runtime_projection is invalid", "$.storage_model.runtime_projection");
    }
    if (storage.immutability !== "semantic_version_required") {
      add(errors, "storage.immutability", "immutability must be semantic_version_required", "$.storage_model.immutability");
    }
  }

  const access = collection.access_control;
  const roles = Array.isArray(access?.roles) ? access.roles : [];
  const permissions = Array.isArray(access?.lifecycle_permissions) ? access.lifecycle_permissions : [];
  const roleNames = new Set();
  if (!isObject(access)) add(errors, "access.object", "access_control must be an object", "$.access_control");
  if (roles.length === 0) add(errors, "access.roles.min", "roles must not be empty", "$.access_control.roles");
  roles.forEach((role, index) => {
    const pathValue = `$.access_control.roles[${index}]`;
    if (!isObject(role)) return add(errors, "role.object", "role must be an object", pathValue);
    if (!ROLES.has(role.role)) add(errors, "role.enum", `role ${role.role} is not allowed`, `${pathValue}.role`);
    roleNames.add(role.role);
    for (const flag of ["can_read", "can_write", "can_approve", "can_activate"]) {
      if (typeof role[flag] !== "boolean") add(errors, "role.flag", `${flag} must be boolean`, `${pathValue}.${flag}`);
    }
    if (role.role === "runtime_reader" && (role.can_write || role.can_approve || role.can_activate)) {
      add(errors, "role.runtime_reader_write", "runtime_reader must not write, approve, or activate", pathValue);
    }
    if (role.role === "publisher" && !role.can_activate) {
      add(errors, "role.publisher_activate", "publisher must be able to activate", pathValue);
    }
  });

  permissions.forEach((permission, index) => {
    const pathValue = `$.access_control.lifecycle_permissions[${index}]`;
    if (!isObject(permission)) return add(errors, "permission.object", "permission must be an object", pathValue);
    if (!LIFECYCLE_ROLES.has(permission.role)) add(errors, "permission.role", `permission role ${permission.role} is not allowed`, `${pathValue}.role`);
    if (permission.to === "active" && permission.role !== "publisher") {
      add(errors, "permission.activate_role", "only publisher may activate a definition", pathValue);
    }
    if (!roleNames.has(permission.role)) add(errors, "permission.role_declared", `permission role ${permission.role} is not declared`, `${pathValue}.role`);
  });

  const definitions = Array.isArray(collection.definitions) ? collection.definitions : [];
  if (definitions.length === 0) add(errors, "definitions.min", "definitions must not be empty", "$.definitions");
  const identity = new Set();
  const activeByKey = new Map();
  const currentlyEffectiveActiveByKey = new Map();
  const now = options.now || "2026-07-06T00:00:00Z";
  definitions.forEach((record, index) => {
    const pathValue = `$.definitions[${index}]`;
    if (!isObject(record)) return add(errors, "definition.object", "definition record must be an object", pathValue);
    if (typeof record.process_key !== "string" || !PROCESS_KEY.test(record.process_key)) add(errors, "definition.process_key", "process_key is invalid", `${pathValue}.process_key`);
    if (typeof record.version !== "string" || !SEMVER.test(record.version)) add(errors, "definition.version", "version must use MAJOR.MINOR.PATCH", `${pathValue}.version`);
    if (!STATUSES.has(record.status)) add(errors, "definition.status", `status ${record.status} is invalid`, `${pathValue}.status`);
    for (const key of ["artifact_id", "definition_ref", "validation_report_ref", "environment", "namespace"]) {
      if (typeof record[key] !== "string" || record[key].length === 0) add(errors, "definition.required", `${key} is required`, `${pathValue}.${key}`);
    }
    if (typeof record.content_hash !== "string" || !SHA256.test(record.content_hash)) add(errors, "definition.content_hash", "content_hash must be sha256:<64 lowercase hex chars>", `${pathValue}.content_hash`);
    if (!["draft", "staging", "production"].includes(record.environment)) add(errors, "definition.environment", "environment is invalid", `${pathValue}.environment`);
    for (const key of ["effective_from", "effective_to", "activated_at", "retired_at"]) {
      if (record[key] !== null && record[key] !== undefined && (typeof record[key] !== "string" || !DATE_TIME.test(record[key]))) {
        add(errors, "definition.date_time", `${key} must be null or UTC date-time`, `${pathValue}.${key}`);
      }
    }
    for (const key of ["created_at", "updated_at"]) {
      if (typeof record[key] !== "string" || !DATE_TIME.test(record[key])) add(errors, "definition.date_time", `${key} must be UTC date-time`, `${pathValue}.${key}`);
    }
    validateActor(record.created_by, errors, `${pathValue}.created_by`);
    validateActor(record.updated_by, errors, `${pathValue}.updated_by`);
    if (record.activated_by !== null && record.activated_by !== undefined) validateActor(record.activated_by, errors, `${pathValue}.activated_by`);
    if (record.retired_by !== null && record.retired_by !== undefined) validateActor(record.retired_by, errors, `${pathValue}.retired_by`);
    const key = `${record.process_key}@${record.version}`;
    if (identity.has(key)) add(errors, "definition.duplicate_identity", `duplicate process identity ${key}`, pathValue);
    identity.add(key);
    if (record.status === "active") {
      activeByKey.set(record.process_key, [...(activeByKey.get(record.process_key) || []), record.version]);
      if (!record.activated_by || !record.activated_at) add(errors, "definition.active_activation_metadata", "active records require activated_by and activated_at", pathValue);
      if (!record.effective_from) add(errors, "definition.active_effective_from", "active records require effective_from", `${pathValue}.effective_from`);
      if (record.effective_from && new Date(record.effective_from) > new Date(now)) add(errors, "definition.active_future", `active record ${record.process_key}@${record.version} is not yet effective`, `${pathValue}.effective_from`);
      if (record.effective_to && new Date(record.effective_to) < new Date(now)) add(errors, "definition.active_expired", `active record ${record.process_key}@${record.version} is expired`, `${pathValue}.effective_to`);
    }
    if (isCurrentlyEffective(record, now)) {
      currentlyEffectiveActiveByKey.set(record.process_key, [...(currentlyEffectiveActiveByKey.get(record.process_key) || []), record.version]);
    }
    const definitionPath = resolveLocalRef(collectionPath, record.definition_ref || "");
    if (definitionPath && !fs.existsSync(definitionPath)) {
      add(errors, "definition.ref_missing", `definition_ref does not exist: ${record.definition_ref}`, `${pathValue}.definition_ref`);
    }
    const reportPath = resolveLocalRef(collectionPath, record.validation_report_ref || "");
    if (reportPath && !fs.existsSync(reportPath)) {
      add(errors, "definition.validation_report_ref_missing", `validation_report_ref does not exist: ${record.validation_report_ref}`, `${pathValue}.validation_report_ref`);
    }
  });
  for (const [processKey, versions] of currentlyEffectiveActiveByKey.entries()) {
    if (versions.length > 1) {
      add(errors, "active.duplicate", `more than one currently effective active version for ${processKey}: ${versions.join(", ")}`, "$.definitions");
    }
  }
  if (options.processKey) {
    const activeVersions = currentlyEffectiveActiveByKey.get(options.processKey) || [];
    if (activeVersions.length === 0) add(errors, "active.zero", `no currently effective active version for ${options.processKey}`, "$.definitions");
    if (activeVersions.length > 1) add(errors, "active.process_key_duplicate", `multiple currently effective active versions for ${options.processKey}: ${activeVersions.join(", ")}`, "$.definitions");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      registry_key: collection.registry_key,
      definitions: definitions.length,
      active_status_process_keys: [...activeByKey.keys()].length,
      currently_effective_active_process_keys: [...currentlyEffectiveActiveByKey.keys()].length,
      roles: roles.length,
      lifecycle_permissions: permissions.length
    }
  };
}

function main() {
  const args = parseArgs(process.argv);
  const collectionPath = path.resolve(args.file);
  const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));
  const result = validateCollection(collection, collectionPath, { now: args.now, processKey: args.processKey });
  const report = {
    validator: "process-registry-collection-validator.v1",
    generated_at: new Date().toISOString(),
    file: collectionPath,
    expected: args.expect || null,
    process_key: args.processKey || null,
    now: args.now,
    actual: result.valid ? "pass" : "fail",
    ...result
  };
  if (args.report) fs.writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (args.expect && args.expect !== report.actual) process.exitCode = 2;
  else if (!args.expect && !result.valid) process.exitCode = 1;
}

main();
