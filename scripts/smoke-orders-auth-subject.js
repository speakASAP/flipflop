#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const namespace = process.env.NAMESPACE || 'statex-apps';
const deployment = process.env.FLIPFLOP_ORDER_DEPLOYMENT || 'flipflop-order-service';
const reportDir = process.env.AUTH_SUBJECT_SMOKE_REPORT_DIR || path.join('reports', 'validation', 'orders-auth-subject-smoke');
const reportPath = path.join(reportDir, 'report-latest.json');
const approved = process.env.RUN_LIVE_AUTH_SUBJECT_ORDERS_SMOKE === '1';
const approvalId = String(process.env.AUTH_SUBJECT_SMOKE_APPROVAL_ID || '').trim();
const confirm = String(process.env.AUTH_SUBJECT_SMOKE_CONFIRM || '').trim();
const cleanupConfirm = String(process.env.AUTH_SUBJECT_SMOKE_CLEANUP_CONFIRM || '').trim();
const catalogProductId = String(process.env.AUTH_SUBJECT_SMOKE_CATALOG_PRODUCT_ID || '').trim();
const warehouseId = String(process.env.AUTH_SUBJECT_SMOKE_WAREHOUSE_ID || '').trim();
const authSubject = String(
  process.env.AUTH_SUBJECT_SMOKE_AUTH_SUBJECT || '11111111-1111-4111-8111-111111111111',
).trim();
const externalOrderId = String(
  process.env.AUTH_SUBJECT_SMOKE_EXTERNAL_ORDER_ID || `flipflop-auth-subject-${Date.now()}`,
).trim();

function kubectl(args, options = {}) {
  return execFileSync('kubectl', ['-n', namespace, ...args], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function podNode(code) {
  return kubectl(['exec', `deployment/${deployment}`, '--', 'node', '-e', code]);
}

function parseJson(text, fallback = {}) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function writeReport(report) {
  if (process.env.WRITE_AUTH_SUBJECT_SMOKE_REPORT === '0') return;
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function preflight() {
  const deploymentJson = parseJson(kubectl(['get', 'deployment', deployment, '-o', 'json']));
  const desired = deploymentJson.spec?.replicas || 0;
  const ready = deploymentJson.status?.readyReplicas || 0;
  const available = deploymentJson.status?.availableReplicas || 0;
  const image = deploymentJson.spec?.template?.spec?.containers?.[0]?.image || '';
  const podEnv = parseJson(podNode(`
    console.log(JSON.stringify({
      ORDERS_SERVICE_URL: Boolean((process.env.ORDERS_SERVICE_URL || process.env.ORDERS_MICROSERVICE_URL || '').trim()),
      ORDERS_SERVICE_TOKEN: Boolean((process.env.ORDERS_SERVICE_TOKEN || '').trim()),
      ORDERS_STATUS_SERVICE_TOKEN: Boolean((process.env.ORDERS_STATUS_SERVICE_TOKEN || '').trim())
    }));
  `));

  const blockers = [];
  if (!desired || ready < desired || available < desired) {
    blockers.push('[MISSING: flipflop-order-service ready deployment]');
  }
  if (!podEnv.ORDERS_SERVICE_URL) blockers.push('[MISSING: ORDERS_SERVICE_URL projected into flipflop-order-service]');
  if (!podEnv.ORDERS_SERVICE_TOKEN) blockers.push('[MISSING: ORDERS_SERVICE_TOKEN projected into flipflop-order-service]');

  return {
    deploymentReady: `${ready}/${desired}`,
    deploymentAvailable: `${available}/${desired}`,
    image,
    podEnv,
    blockers,
  };
}

function validateApprovalInputs(blockers, preflightResult) {
  if (!approved) blockers.push('[MISSING: RUN_LIVE_AUTH_SUBJECT_ORDERS_SMOKE=1]');
  if (!approvalId) blockers.push('[MISSING: AUTH_SUBJECT_SMOKE_APPROVAL_ID]');
  if (confirm !== 'CREATE_READ_OPTIONAL_CANCEL') {
    blockers.push('[MISSING: AUTH_SUBJECT_SMOKE_CONFIRM=CREATE_READ_OPTIONAL_CANCEL]');
  }
  if (approved && !isUuid(authSubject)) blockers.push('[MISSING: UUID AUTH_SUBJECT_SMOKE_AUTH_SUBJECT]');
  if (approved && !isUuid(catalogProductId)) blockers.push('[MISSING: AUTH_SUBJECT_SMOKE_CATALOG_PRODUCT_ID]');
  if (approved && !isUuid(warehouseId)) blockers.push('[MISSING: AUTH_SUBJECT_SMOKE_WAREHOUSE_ID]');
  if (approved && cleanupConfirm !== 'ORDERS_ADMIN_STATUS_CANCEL') {
    blockers.push('[MISSING: AUTH_SUBJECT_SMOKE_CLEANUP_CONFIRM=ORDERS_ADMIN_STATUS_CANCEL]');
  }
  if (approved && !preflightResult?.podEnv?.ORDERS_STATUS_SERVICE_TOKEN) {
    blockers.push('[MISSING: ORDERS_STATUS_SERVICE_TOKEN projected into flipflop-order-service for cleanup]');
  }
}

function runApprovedSmoke() {
  const encodedInput = Buffer.from(JSON.stringify({
    approvalId,
    authSubject,
    catalogProductId,
    warehouseId,
    externalOrderId,
  })).toString('base64');

  return parseJson(podNode(`
    (async () => {
      const input = JSON.parse(Buffer.from('${encodedInput}', 'base64').toString('utf8'));
      const ordersUrl = (process.env.ORDERS_SERVICE_URL || process.env.ORDERS_MICROSERVICE_URL || 'http://orders-microservice:3203').replace(/\\/$/, '');
      const serviceToken = String(process.env.ORDERS_SERVICE_TOKEN || '').trim();
      const statusToken = String(process.env.ORDERS_STATUS_SERVICE_TOKEN || '').trim();
      const headers = {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-internal-service-token': serviceToken,
        'x-service-name': 'flipflop-service',
        'idempotency-key': 'orders.create.v1:flipflop:auth-subject-smoke:' + input.externalOrderId,
      };
      const payload = {
        contractVersion: 'orders.create.v1',
        channel: 'flipflop',
        channelAccountId: 'flipflop-auth-subject-smoke',
        externalOrderId: input.externalOrderId,
        customer: {
          name: 'Auth Subject Smoke',
          email: 'auth-subject-smoke@flipflop.invalid',
          authSubject: input.authSubject,
        },
        shippingAddress: {
          name: 'Auth Subject Smoke',
          street: 'Smoke 1',
          city: 'Praha',
          postalCode: '11000',
          country: 'CZ',
        },
        billingAddress: {
          name: 'Auth Subject Smoke',
          street: 'Smoke 1',
          city: 'Praha',
          postalCode: '11000',
          country: 'CZ',
        },
        items: [{
          productId: input.catalogProductId,
          sku: 'auth-subject-smoke',
          title: 'Auth Subject Smoke',
          quantity: 1,
          unitPrice: 1,
          totalPrice: 1,
          warehouseId: input.warehouseId,
        }],
        totals: {
          subtotal: 1,
          shippingCost: 0,
          taxAmount: 0,
          total: 1,
          currency: 'CZK',
        },
        payment: {
          method: 'invoice',
          status: 'pending',
        },
        shipping: {
          method: 'smoke',
        },
      };

      const createdResponse = await fetch(ordersUrl + '/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const createdBody = await createdResponse.json().catch(() => ({}));
      const order = createdBody?.data?.order || createdBody?.data || createdBody?.order || {};
      const orderId = String(order?.id || order?.orderId || '').trim();
      const result = {
        createHttpStatus: createdResponse.status,
        orderIdPresent: Boolean(orderId),
        readHttpStatus: null,
        authSubjectPersisted: false,
        cleanup: {
          attempted: false,
          skippedReason: statusToken ? null : 'missing_ORDERS_STATUS_SERVICE_TOKEN',
          httpStatus: null,
        },
      };

      if (orderId) {
        const readResponse = await fetch(ordersUrl + '/api/orders/' + encodeURIComponent(orderId), {
          headers: {
            accept: 'application/json',
            'x-internal-service-token': serviceToken,
            'x-service-name': 'flipflop-service',
          },
        });
        result.readHttpStatus = readResponse.status;
        const readBody = await readResponse.json().catch(() => ({}));
        const detail = readBody?.data?.order || readBody?.data || readBody?.order || {};
        const customer = detail.customer || {};
        result.authSubjectPersisted =
          customer.authUserId === input.authSubject ||
          customer.subject === input.authSubject ||
          customer.authSubject === input.authSubject;

        if (statusToken) {
          result.cleanup.attempted = true;
          const cancelResponse = await fetch(ordersUrl + '/api/orders/' + encodeURIComponent(orderId) + '/status', {
            method: 'PUT',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              authorization: statusToken.startsWith('Bearer ') ? statusToken : 'Bearer ' + statusToken,
              'x-service-name': 'flipflop-service',
            },
            body: JSON.stringify({
              status: 'cancelled',
              approval: {
                id: input.approvalId,
                approved: true,
                approvalType: 'human',
                reasonCode: 'synthetic_auth_subject_smoke_cleanup',
                reason: 'auth_subject_invoice_account_smoke_cleanup',
                sideEffectsHandled: {
                  payment: true,
                  warehouse: true,
                  notification: true,
                  crm: true,
                  channel: true,
                },
              },
            }),
          });
          result.cleanup.httpStatus = cancelResponse.status;
        }
      }

      console.log(JSON.stringify(result));
    })().catch((error) => {
      console.log(JSON.stringify({
        error: String(error && error.message ? error.message : error).slice(0, 160)
      }));
      process.exit(1);
    });
  `), {});
}

function main() {
  const report = {
    ok: false,
    generatedAt: new Date().toISOString(),
    mutation: false,
    providerCall: false,
    approvalIdPresent: Boolean(approvalId),
    confirmation: confirm || null,
    preflight: preflight(),
    result: null,
    blockers: [],
    cleanupAuthorityConfirmed: cleanupConfirm === 'ORDERS_ADMIN_STATUS_CANCEL',
    next: 'Set RUN_LIVE_AUTH_SUBJECT_ORDERS_SMOKE=1, AUTH_SUBJECT_SMOKE_APPROVAL_ID, AUTH_SUBJECT_SMOKE_CONFIRM=CREATE_READ_OPTIONAL_CANCEL, AUTH_SUBJECT_SMOKE_CLEANUP_CONFIRM=ORDERS_ADMIN_STATUS_CANCEL, AUTH_SUBJECT_SMOKE_CATALOG_PRODUCT_ID, AUTH_SUBJECT_SMOKE_WAREHOUSE_ID, and project ORDERS_STATUS_SERVICE_TOKEN only after owner approval for one synthetic central Orders create/read/cancel smoke.',
  };
  report.blockers.push(...report.preflight.blockers);
  validateApprovalInputs(report.blockers, report.preflight);

  if (report.blockers.length) {
    writeReport(report);
    console.log(JSON.stringify(report, null, 2));
    process.exit(approved ? 2 : 3);
  }

  report.mutation = true;
  report.result = runApprovedSmoke();
  report.ok =
    report.result.createHttpStatus === 201 &&
    report.result.orderIdPresent === true &&
    report.result.readHttpStatus === 200 &&
    report.result.authSubjectPersisted === true &&
    report.result.cleanup?.attempted === true &&
    report.result.cleanup?.httpStatus >= 200 &&
    report.result.cleanup?.httpStatus < 300;

  if (!report.ok) {
    if (report.result?.authSubjectPersisted !== true) {
      report.blockers.push('[MISSING: runtime Orders snapshot persisted customer.authSubject]');
    }
    if (report.result?.cleanup?.attempted !== true || !(report.result?.cleanup?.httpStatus >= 200 && report.result?.cleanup?.httpStatus < 300)) {
      report.blockers.push('[MISSING: runtime cleanup cancelled synthetic Orders order]');
    }
  }

  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
