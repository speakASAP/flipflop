#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function parseJson(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {}
    }
  }
  return null;
}

const files = {
  packageJson: 'package.json',
  ordersVerifier: 'scripts/verify-orders-hub-integration.js',
  authSubjectSmoke: 'scripts/smoke-orders-auth-subject.js',
  authWalletGatewaySmoke: 'scripts/smoke-auth-wallet-checkout-profile.js',
  authWalletBrowserSmoke: 'scripts/smoke-auth-wallet-browser-session.js',
  ordersService: 'services/order-service/src/orders/orders.service.ts',
  orderClient: 'shared/clients/order-client.service.ts',
  state: 'docs/IMPLEMENTATION_STATE.md',
};

const packageJson = JSON.parse(read(files.packageJson));
const ordersVerifier = read(files.ordersVerifier);
const authSubjectSmoke = read(files.authSubjectSmoke);
const authWalletGatewaySmoke = read(files.authWalletGatewaySmoke);
const authWalletBrowserSmoke = read(files.authWalletBrowserSmoke);
const ordersService = read(files.ordersService);
const orderClient = read(files.orderClient);
const state = read(files.state);

const payloadBuilder = ordersService.slice(
  ordersService.indexOf('private buildCentralOrdersPayload'),
  ordersService.indexOf('private getCentralOrdersChannelAccountId'),
);

assert(packageJson.scripts['verify:orders-hub-integration'] === 'node scripts/verify-orders-hub-integration.js', 'orders hub verifier script missing');
assert(packageJson.scripts['smoke:orders-auth-subject'] === 'node scripts/smoke-orders-auth-subject.js', 'orders auth subject smoke script missing');
assert(packageJson.scripts['smoke:auth-wallet-checkout-profile'] === 'node scripts/smoke-auth-wallet-checkout-profile.js', 'auth wallet gateway smoke script missing');
assert(packageJson.scripts['smoke:auth-wallet-browser-session'] === 'node scripts/smoke-auth-wallet-browser-session.js', 'auth wallet browser smoke script missing');

assert(orderClient.includes("const CREATE_ORDER_CONTRACT_VERSION = 'orders.create.v1'"), 'central Orders contract version missing');
assert(orderClient.includes('authSubject?: string'), 'shared Orders client type missing authSubject');
assert(payloadBuilder.includes('authSubject: this.isUuid(user?.id) ? user.id : undefined'), 'authenticated checkout does not forward UUID-shaped Auth subject');
assert(payloadBuilder.includes('const rawBillingAddress = billingAddress || deliveryAddress'), 'billing fallback boundary missing');
for (const field of ['companyName', 'companyId', 'taxId', 'vatId', 'email']) {
  assert(payloadBuilder.includes(`${field}: this.normalizeGuestText(rawBillingAddress.${field}`), `billing snapshot missing ${field}`);
}
assert(payloadBuilder.includes('shippingAddress: boundedDeliveryAddress'), 'shipping snapshot not bounded');
assert(payloadBuilder.includes('billingAddress: boundedBillingAddress'), 'billing snapshot not bounded');
assert(!payloadBuilder.includes('walletDeliveryAddressId'), 'payload must not forward wallet delivery ids');
assert(!payloadBuilder.includes('walletInvoiceProfileId'), 'payload must not forward wallet invoice ids');

for (const required of [
  'RUN_LIVE_AUTH_SUBJECT_ORDERS_SMOKE',
  'AUTH_SUBJECT_SMOKE_APPROVAL_ID',
  'AUTH_SUBJECT_SMOKE_CONFIRM=CREATE_READ_OPTIONAL_CANCEL',
  'AUTH_SUBJECT_SMOKE_CLEANUP_CONFIRM=ORDERS_ADMIN_STATUS_CANCEL',
  'AUTH_SUBJECT_SMOKE_CATALOG_PRODUCT_ID',
  'AUTH_SUBJECT_SMOKE_WAREHOUSE_ID',
  'authSubjectPersisted',
  'WRITE_AUTH_SUBJECT_SMOKE_REPORT',
  'ORDERS_STATUS_SERVICE_TOKEN projected into flipflop-order-service for cleanup',
  'runtime cleanup cancelled synthetic Orders order',
  '[89ab][0-9a-f]{3}',
  "approvalType: 'human'",
  "reasonCode: 'synthetic_auth_subject_smoke_cleanup'",
  'sideEffectsHandled',
  'payment: true',
  'warehouse: true',
  'notification: true',
  'crm: true',
  'channel: true',
]) {
  assert(authSubjectSmoke.includes(required), `auth-subject smoke missing guard marker ${required}`);
}
assert(authSubjectSmoke.includes('report.mutation = true') && authSubjectSmoke.includes('if (report.blockers.length)'), 'auth-subject smoke must remain non-mutating before approval gates pass');
assert(authSubjectSmoke.includes('cleanup.attempted') && authSubjectSmoke.includes('/status'), 'auth-subject smoke cleanup path missing');
assert(authSubjectSmoke.includes('validateApprovalInputs(report.blockers, report.preflight)'), 'auth-subject smoke must validate cleanup token before mutation');
assert(authSubjectSmoke.includes('report.result.cleanup?.attempted === true'), 'auth-subject smoke pass condition must require cleanup attempt');
assert(authSubjectSmoke.includes('report.result.cleanup?.httpStatus >= 200'), 'auth-subject smoke pass condition must require cleanup success status');
assert(authSubjectSmoke.includes("cleanupAuthorityConfirmed: cleanupConfirm === 'ORDERS_ADMIN_STATUS_CANCEL'"), 'auth-subject smoke must require cleanup authority confirmation');
assert(authSubjectSmoke.includes("approvalType: 'human'") && authSubjectSmoke.includes("reasonCode: 'synthetic_auth_subject_smoke_cleanup'"), 'auth-subject smoke cleanup body must satisfy Orders cancellation approval contract');
for (const sideEffect of ['payment', 'warehouse', 'notification', 'crm', 'channel']) {
  assert(authSubjectSmoke.includes(`${sideEffect}: true`), `auth-subject smoke cleanup must acknowledge ${sideEffect}`);
}

for (const required of [
  'approval_required_no_live_mutation',
  'POST/PATCH/POST default/DELETE ${paths.deliveryAddresses}',
  'POST/PATCH/POST default/DELETE ${paths.invoiceProfiles}',
  'submitsCheckoutOrder: false',
  'printsToken: false',
  'readsDatabase: false',
]) {
  assert(authWalletGatewaySmoke.includes(required), `auth wallet gateway smoke missing ${required}`);
}
for (const required of [
  'manualEditCompanyPreservedAfterDelayedWallet',
  'explicitInvoiceSelectorApplied',
  'explicitDeliverySelectorApplied',
  'checkoutSubmitButtonPresentButNotClicked',
]) {
  assert(authWalletBrowserSmoke.includes(required), `auth wallet browser smoke missing ${required}`);
}

assert(ordersVerifier.includes('central Orders payload must forward separate bounded shipping and billing snapshots with Auth invoice fields'), 'orders verifier missing Auth invoice snapshot assertion');
assert(ordersVerifier.includes('authenticated FlipFlop checkout must forward the Auth-compatible user UUID as customer.authSubject'), 'orders verifier missing authSubject assertion');
assert(state.includes('[MISSING: approved RUN_LIVE_AUTH_SUBJECT_ORDERS_SMOKE=1 runtime execution'), 'state must preserve live runtime smoke blocker');

const verifierRun = run('npm', ['run', 'verify:orders-hub-integration']);
assert(verifierRun.status === 0, 'verify:orders-hub-integration failed');

const defaultSmoke = run('node', ['scripts/smoke-orders-auth-subject.js'], {
  env: { WRITE_AUTH_SUBJECT_SMOKE_REPORT: '0' },
});
const defaultSmokeJson = parseJson(defaultSmoke.stdout);
assert(defaultSmokeJson, 'default auth-subject smoke did not print JSON');
assert(defaultSmokeJson.mutation === false, 'default auth-subject smoke must be non-mutating');
assert(defaultSmokeJson.providerCall === false, 'default auth-subject smoke must not call provider');
assert(Array.isArray(defaultSmokeJson.blockers), 'default auth-subject smoke blockers missing');
assert(defaultSmokeJson.blockers.includes('[MISSING: RUN_LIVE_AUTH_SUBJECT_ORDERS_SMOKE=1]'), 'default smoke must require live approval flag');
assert(defaultSmokeJson.blockers.includes('[MISSING: AUTH_SUBJECT_SMOKE_CONFIRM=CREATE_READ_OPTIONAL_CANCEL]'), 'default smoke must require confirm marker');

const report = {
  ok: true,
  status: 'approval_required_auth_wallet_order_snapshot_runtime_gate',
  sourceOnly: true,
  liveOrderSubmit: false,
  orderCreated: false,
  warehouseMutation: false,
  paymentCreation: false,
  notificationSend: false,
  databaseRead: false,
  tokenPrinted: false,
  customerDataPrinted: false,
  evidence: {
    ordersHubVerifierPassed: true,
    defaultAuthSubjectSmokeExitStatus: defaultSmoke.status,
    defaultAuthSubjectSmokeMutation: defaultSmokeJson.mutation,
    defaultAuthSubjectSmokeProviderCall: defaultSmokeJson.providerCall,
    deploymentReady: defaultSmokeJson.preflight?.deploymentReady || null,
    ordersServiceUrlProjected: Boolean(defaultSmokeJson.preflight?.podEnv?.ORDERS_SERVICE_URL),
    ordersServiceTokenPresent: Boolean(defaultSmokeJson.preflight?.podEnv?.ORDERS_SERVICE_TOKEN),
    ordersStatusServiceTokenPresent: Boolean(defaultSmokeJson.preflight?.podEnv?.ORDERS_STATUS_SERVICE_TOKEN),
    cleanupRequiredForPass: true,
    billingSnapshotFields: ['companyName', 'companyId', 'taxId', 'vatId', 'email'],
    customerAuthSubjectSource: 'UUID-shaped authenticated user id only',
    authWalletSelectorEvidence: [
      'gateway wallet CRUD/default cleanup smoke passed previously',
      'browser selector delayed-response smoke passed previously',
    ],
  },
  blockers: [
    '[MISSING: approved RUN_LIVE_AUTH_SUBJECT_ORDERS_SMOKE=1 runtime execution with non-secret AUTH_SUBJECT_SMOKE_APPROVAL_ID]',
    '[MISSING: owner-approved fixture AUTH_SUBJECT_SMOKE_CATALOG_PRODUCT_ID and AUTH_SUBJECT_SMOKE_WAREHOUSE_ID]',
    '[MISSING: persisted central Orders customer.authSubject/billingAddress runtime read evidence]',
    '[MISSING: cleanup-capable ORDERS_STATUS_SERVICE_TOKEN projection before create/read/cancel smoke]',
    '[MISSING: AUTH_SUBJECT_SMOKE_CLEANUP_CONFIRM=ORDERS_ADMIN_STATUS_CANCEL]',
  ],
  next: 'Open the guarded live create/read/cancel smoke only after owner approval for one synthetic central Orders order, cleanup-capable ORDERS_STATUS_SERVICE_TOKEN projection, cleanup authority confirmation, and sanitized persisted snapshot evidence.',
};

const reportDir = path.join(root, 'reports', 'validation');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'auth-wallet-order-snapshot-gate.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
