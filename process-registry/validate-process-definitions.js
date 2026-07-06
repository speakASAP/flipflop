#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const schemaPath = path.join(root, 'process-registry/process-definition.schema.json');
const processesRoot = path.join(root, 'processes');
const unresolvedPattern = /\[(MISSING|UNKNOWN):[^\]]+\]/;
const lifecycleStates = ['draft', 'validated', 'scheduled', 'active', 'paused', 'retired'];
const requiredCorrelationFields = [
  'event_id',
  'event_name',
  'version',
  'occurred_at',
  'journey_id',
  'correlation_id',
  'causation_id',
  'idempotency_key',
  'source.service',
  'source.component',
  'environment.name',
  'metadata.channel',
];
const requiredIdentifierFields = [
  'identifiers.anonymous_id',
  'identifiers.session_id',
  'identifiers.customer_id',
  'identifiers.auth_subject',
];
const forbiddenFieldNames = [
  'raw card data',
  'raw JWT/access tokens',
  'passwords',
  'provider secrets',
  'raw payment credentials',
  'unapproved raw PII',
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${filePath}: invalid JSON: ${error.message}`);
  }
}

function collectDefinitionFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectDefinitionFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.process.json')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function requireType(condition, filePath, message, errors) {
  if (!condition) errors.push(`${filePath}: ${message}`);
}

function inspectForUnresolved(value, pathParts = []) {
  const hits = [];
  if (typeof value === 'string' && unresolvedPattern.test(value)) {
    hits.push(pathParts.join('.') || '<root>');
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => hits.push(...inspectForUnresolved(item, [...pathParts, String(index)])));
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      hits.push(...inspectForUnresolved(nested, [...pathParts, key]));
    }
  }
  return hits;
}

function validateDefinition(definition, filePath, schema) {
  const errors = [];
  for (const key of schema.required) {
    requireType(Object.prototype.hasOwnProperty.call(definition, key), filePath, `missing required field ${key}`, errors);
  }
  requireType(definition.schemaVersion === 'bpcp.process.v1', filePath, 'schemaVersion must be bpcp.process.v1', errors);
  requireType(/^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)*$/.test(definition.processId || ''), filePath, 'processId must be lowercase identifier with optional dotted namespace', errors);
  requireType(Number.isInteger(definition.version) && definition.version > 0, filePath, 'version must be a positive integer', errors);
  requireType(lifecycleStates.includes(definition.status), filePath, `status must be one of ${lifecycleStates.join(', ')}`, errors);
  requireType(Array.isArray(definition.lifecycle?.states), filePath, 'lifecycle.states must be an array', errors);
  for (const state of lifecycleStates) {
    requireType(definition.lifecycle?.states?.includes(state), filePath, `lifecycle.states missing ${state}`, errors);
  }

  const steps = Array.isArray(definition.steps) ? definition.steps : [];
  const stepIds = new Set();
  requireType(steps.length > 0, filePath, 'steps must not be empty', errors);
  for (const step of steps) {
    requireType(/^[a-z][a-z0-9_]*$/.test(step.id || ''), filePath, `invalid step id ${step.id}`, errors);
    requireType(Boolean(step.capability), filePath, `step ${step.id || '<unknown>'} missing capability`, errors);
    stepIds.add(step.id);
  }

  const transitions = Array.isArray(definition.allowedTransitions) ? definition.allowedTransitions : [];
  requireType(transitions.length > 0, filePath, 'allowedTransitions must not be empty', errors);
  for (const transition of transitions) {
    if (transition.from !== 'START') {
      requireType(stepIds.has(transition.from), filePath, `transition.from references unknown step ${transition.from}`, errors);
    }
    if (transition.to !== 'END') {
      requireType(stepIds.has(transition.to), filePath, `transition.to references unknown step ${transition.to}`, errors);
    }
  }

  const events = Array.isArray(definition.events) ? definition.events : [];
  requireType(events.length > 0, filePath, 'events must not be empty', errors);
  for (const event of events) {
    const requiredFields = Array.isArray(event.required_fields) ? event.required_fields : [];
    for (const requiredField of requiredCorrelationFields) {
      requireType(requiredFields.includes(requiredField), filePath, `event ${event.name} missing required field ${requiredField}`, errors);
    }
    requireType(requiredIdentifierFields.some((field) => requiredFields.includes(field)), filePath, `event ${event.name} must require one approved identifier field`, errors);
    const forbiddenFields = Array.isArray(event.forbidden_fields) ? event.forbidden_fields : [];
    for (const forbiddenField of forbiddenFieldNames) {
      requireType(forbiddenFields.includes(forbiddenField), filePath, `event ${event.name} missing forbidden field ${forbiddenField}`, errors);
    }
  }

  const failClosedGuards = (Array.isArray(definition.guards) ? definition.guards : []).filter((guard) => guard.mode === 'fail_closed');
  requireType(failClosedGuards.length > 0, filePath, 'at least one fail_closed guard is required', errors);

  const activationEligible = definition.status === 'validated' || definition.status === 'scheduled' || definition.status === 'active';
  if (activationEligible) {
    const unresolved = inspectForUnresolved(definition);
    requireType(unresolved.length === 0, filePath, `${definition.status} definitions must not contain unresolved markers: ${unresolved.join(', ')}`, errors);
    requireType(definition.owner && definition.owner !== '[MISSING: process owner]', filePath, `${definition.status} definitions require owner`, errors);
    requireType(definition.approver && definition.approver !== '[MISSING: approval authority]', filePath, `${definition.status} definitions require approver`, errors);
    requireType(definition.approval_evidence && definition.approval_evidence !== '[MISSING: approval evidence]', filePath, `${definition.status} definitions require approval_evidence`, errors);
    requireType(definition.activeFrom && definition.activeFrom !== '[MISSING: effective window]', filePath, `${definition.status} definitions require activeFrom`, errors);
    requireType(definition.rollbackTo && definition.rollbackTo !== '[MISSING: rollback process version]', filePath, `${definition.status} definitions require rollbackTo`, errors);
    requireType((definition.validation_evidence || []).length > 0, filePath, `${definition.status} definitions require validation_evidence`, errors);
    requireType(!definition.blockers || definition.blockers.length === 0, filePath, `${definition.status} definitions must not have blockers`, errors);
  }

  return errors;
}

function main() {
  const schema = readJson(schemaPath);
  const files = collectDefinitionFiles(processesRoot);
  if (files.length === 0) {
    throw new Error('No process definitions found under processes/**/*.process.json');
  }

  const errors = [];
  const activeByProcess = new Map();
  for (const file of files) {
    const definition = readJson(file);
    errors.push(...validateDefinition(definition, path.relative(root, file), schema));
    if (definition.status === 'active') {
      const existing = activeByProcess.get(definition.processId);
      if (existing) {
        errors.push(`Multiple active definitions for ${definition.processId}: ${existing} and ${path.relative(root, file)}`);
      }
      activeByProcess.set(definition.processId, path.relative(root, file));
    }
  }

  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, errors }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    checkedDefinitions: files.map((file) => path.relative(root, file)),
    activeDefinitions: Object.fromEntries(activeByProcess),
    failClosedActiveDefinitionPolicy: 'validated, scheduled, and active definitions reject unresolved [MISSING]/[UNKNOWN] markers, blockers, missing approval evidence, missing rollback/effective window, and duplicate active process IDs',
  }, null, 2));
}

main();
