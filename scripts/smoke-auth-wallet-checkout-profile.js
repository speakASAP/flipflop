#!/usr/bin/env node
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const DEFAULT_BASE_URL = 'https://flipflop.alfares.cz';
const REQUIRED_CONFIRM = 'CHECKOUT_PROFILE_WALLET';

const paths = {
  checkoutPage: '/checkout',
  profileAddressesPage: '/profile/addresses',
  profileInvoiceProfilesPage: '/profile/invoice-profiles',
  checkoutData: '/api/auth/profile/checkout-data',
  deliveryAddresses: '/api/auth/profile/delivery-addresses',
  invoiceProfiles: '/api/auth/profile/invoice-profiles',
};

function parseArgs(argv) {
  return argv.reduce(
    (options, arg) => {
      if (arg === '--execute') {
        options.execute = true;
      } else if (arg.startsWith('--base-url=')) {
        options.baseUrl = arg.slice('--base-url='.length);
      } else if (arg === '--skip-source-verifiers') {
        options.skipSourceVerifiers = true;
      } else if (arg === '--help' || arg === '-h') {
        options.help = true;
      } else {
        throw new Error(`Unknown argument: ${arg}`);
      }
      return options;
    },
    {
      execute: false,
      baseUrl: process.env.FLIPFLOP_AUTH_WALLET_SMOKE_BASE_URL || DEFAULT_BASE_URL,
      skipSourceVerifiers: false,
      help: false,
    },
  );
}

function printHelp() {
  console.log(`Usage: node scripts/smoke-auth-wallet-checkout-profile.js [--execute] [--base-url=https://flipflop.alfares.cz] [--skip-source-verifiers]

Approval-gated FlipFlop Auth wallet checkout/profile smoke.

Default mode is non-mutating and runs source verifiers only. Live execution
requires:
  --execute
  RUN_LIVE_FLIPFLOP_AUTH_WALLET_SMOKE=1
  FLIPFLOP_AUTH_WALLET_SMOKE_APPROVAL_ID=<non-secret approval id>
  FLIPFLOP_AUTH_WALLET_SMOKE_CONFIRM=CHECKOUT_PROFILE_WALLET
  FLIPFLOP_AUTH_WALLET_SMOKE_BEARER_TOKEN=<owner-approved synthetic token>

Live mode calls only FlipFlop public pages and gateway-proxied Auth wallet
endpoints, creates synthetic wallet rows for the token subject, defaults them,
verifies checkout-data visibility through FlipFlop, and deletes what it creates.
It does not submit a checkout order or print tokens/payloads/response bodies.`);
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

function token() {
  return String(process.env.FLIPFLOP_AUTH_WALLET_SMOKE_BEARER_TOKEN || '').trim();
}

function hashId(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
}

function runCommand(command, args) {
  execFileSync(command, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

function runSourceVerifiers(skip) {
  if (skip) {
    return { skipped: true };
  }
  runCommand('npm', ['run', 'verify:auth-wallet-profile-ui']);
  runCommand('npm', ['run', 'verify:auth-wallet-checkout-selectors']);
  runCommand('npm', ['run', 'verify:orders-hub-integration']);
  return {
    skipped: false,
    profileUi: true,
    checkoutSelectors: true,
    manualEditBeforeWalletResponseGuard: true,
    explicitSelectorOverride: true,
    checkoutWalletSaveBack: true,
    profileInvoiceCrudDefaultUi: true,
    orderPayloadSnapshotBoundary: true,
  };
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    method: options.method || 'GET',
    redirect: 'manual',
    headers: {
      accept: 'application/json',
      'user-agent': 'flipflop-auth-wallet-smoke/1.0',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let data = null;
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  return { statusCode: response.status, data };
}

function assert2xx(response, label) {
  if (response.statusCode < 200 || response.statusCode > 299) {
    throw new Error(`${label} returned HTTP ${response.statusCode}`);
  }
}

function itemFromResponse(data, key) {
  if (!data || typeof data !== 'object') return null;
  if (data[key]) return data[key];
  if (data.data && typeof data.data === 'object') {
    return data.data[key] || data.data;
  }
  return null;
}

function listFromResponse(data, key) {
  const value = itemFromResponse(data, key);
  return Array.isArray(value) ? value : [];
}

function findById(items, id) {
  return Array.isArray(items) ? items.find((item) => item && item.id === id) : null;
}

function syntheticPayloads(runId) {
  return {
    deliveryCreate: {
      label: `flipflop-wallet-smoke-${runId}`,
      firstName: 'Synthetic',
      lastName: 'FlipFlopWallet',
      street: 'Flip Smoke 10',
      city: 'Praha',
      postalCode: '11000',
      country: 'CZ',
      phone: '+420777111000',
      isDefault: false,
    },
    deliveryUpdate: {
      label: `flipflop-wallet-smoke-${runId}-updated`,
      city: 'Brno',
      postalCode: '60200',
      isDefault: false,
    },
    invoiceCreate: {
      label: `flipflop-invoice-smoke-${runId}`,
      type: 'company',
      firstName: 'Synthetic',
      lastName: 'FlipFlopInvoice',
      companyName: 'FlipFlop Synthetic Smoke s.r.o.',
      companyId: '12345678',
      taxId: 'CZ12345678',
      vatId: 'CZ12345678',
      street: 'Invoice Smoke 20',
      city: 'Praha',
      postalCode: '11000',
      country: 'CZ',
      email: `flipflop-invoice-smoke-${runId}@example.invalid`,
      phone: '+420777111001',
      isDefault: false,
    },
    invoiceUpdate: {
      label: `flipflop-invoice-smoke-${runId}-updated`,
      city: 'Ostrava',
      postalCode: '70200',
      isDefault: false,
    },
  };
}

function liveGateMissing(options) {
  const missing = [];
  if (!options.execute) missing.push('--execute');
  if (process.env.RUN_LIVE_FLIPFLOP_AUTH_WALLET_SMOKE !== '1') {
    missing.push('RUN_LIVE_FLIPFLOP_AUTH_WALLET_SMOKE=1');
  }
  if (!process.env.FLIPFLOP_AUTH_WALLET_SMOKE_APPROVAL_ID) {
    missing.push('FLIPFLOP_AUTH_WALLET_SMOKE_APPROVAL_ID');
  }
  if (process.env.FLIPFLOP_AUTH_WALLET_SMOKE_CONFIRM !== REQUIRED_CONFIRM) {
    missing.push(`FLIPFLOP_AUTH_WALLET_SMOKE_CONFIRM=${REQUIRED_CONFIRM}`);
  }
  if (!token()) {
    missing.push('FLIPFLOP_AUTH_WALLET_SMOKE_BEARER_TOKEN');
  }
  return missing;
}

async function cleanup(baseUrl, bearerToken, created, steps) {
  const cleanupResults = [];
  if (created.deliveryAddressId) {
    const response = await request(baseUrl, `${paths.deliveryAddresses}/${encodeURIComponent(created.deliveryAddressId)}`, {
      method: 'DELETE',
      token: bearerToken,
    }).catch((error) => ({ statusCode: 0, error: error.message, data: null }));
    steps.push({ method: 'DELETE', path: `${paths.deliveryAddresses}/:id`, statusCode: response.statusCode, idHash: hashId(created.deliveryAddressId) });
    cleanupResults.push({
      resource: 'deliveryAddress',
      statusCode: response.statusCode,
      idHash: hashId(created.deliveryAddressId),
      ok: response.statusCode >= 200 && response.statusCode <= 299,
    });
  }
  if (created.invoiceProfileId) {
    const response = await request(baseUrl, `${paths.invoiceProfiles}/${encodeURIComponent(created.invoiceProfileId)}`, {
      method: 'DELETE',
      token: bearerToken,
    }).catch((error) => ({ statusCode: 0, error: error.message, data: null }));
    steps.push({ method: 'DELETE', path: `${paths.invoiceProfiles}/:id`, statusCode: response.statusCode, idHash: hashId(created.invoiceProfileId) });
    cleanupResults.push({
      resource: 'invoiceProfile',
      statusCode: response.statusCode,
      idHash: hashId(created.invoiceProfileId),
      ok: response.statusCode >= 200 && response.statusCode <= 299,
    });
  }
  return cleanupResults;
}

async function executeRuntime(options) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const bearerToken = token();
  const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const payloads = syntheticPayloads(runId);
  const created = {};
  const steps = [];
  const assertions = {};

  for (const pagePath of [paths.checkoutPage, paths.profileAddressesPage, paths.profileInvoiceProfilesPage]) {
    const page = await request(baseUrl, pagePath);
    steps.push({ method: 'GET', path: pagePath, statusCode: page.statusCode });
    assertions[`page${pagePath.replace(/[^a-z0-9]/gi, '_')}`] = page.statusCode >= 200 && page.statusCode < 400;
  }

  try {
    const initialCheckout = await request(baseUrl, paths.checkoutData, { token: bearerToken });
    assert2xx(initialCheckout, 'gateway checkout-data');
    steps.push({ method: 'GET', path: paths.checkoutData, statusCode: initialCheckout.statusCode });
    assertions.checkoutDataViaFlipFlopGateway = true;
    assertions.schemaVersion = initialCheckout.data?.schemaVersion || initialCheckout.data?.data?.schemaVersion || null;

    const deliveryCreate = await request(baseUrl, paths.deliveryAddresses, {
      method: 'POST',
      token: bearerToken,
      body: payloads.deliveryCreate,
    });
    assert2xx(deliveryCreate, 'gateway create delivery address');
    const deliveryAddress = itemFromResponse(deliveryCreate.data, 'deliveryAddress');
    created.deliveryAddressId = deliveryAddress?.id;
    if (!created.deliveryAddressId) throw new Error('delivery create response missing id');
    steps.push({ method: 'POST', path: paths.deliveryAddresses, statusCode: deliveryCreate.statusCode, idHash: hashId(created.deliveryAddressId) });

    const deliveryUpdate = await request(baseUrl, `${paths.deliveryAddresses}/${encodeURIComponent(created.deliveryAddressId)}`, {
      method: 'PATCH',
      token: bearerToken,
      body: payloads.deliveryUpdate,
    });
    assert2xx(deliveryUpdate, 'gateway update delivery address');
    steps.push({ method: 'PATCH', path: `${paths.deliveryAddresses}/:id`, statusCode: deliveryUpdate.statusCode, idHash: hashId(created.deliveryAddressId) });

    const deliveryDefault = await request(baseUrl, `${paths.deliveryAddresses}/${encodeURIComponent(created.deliveryAddressId)}/default`, {
      method: 'POST',
      token: bearerToken,
    });
    assert2xx(deliveryDefault, 'gateway default delivery address');
    const defaultDelivery = itemFromResponse(deliveryDefault.data, 'deliveryAddress');
    assertions.deliveryDefaultSelected = defaultDelivery?.id === created.deliveryAddressId && defaultDelivery?.isDefault === true;
    steps.push({ method: 'POST', path: `${paths.deliveryAddresses}/:id/default`, statusCode: deliveryDefault.statusCode, idHash: hashId(created.deliveryAddressId) });

    const invoiceCreate = await request(baseUrl, paths.invoiceProfiles, {
      method: 'POST',
      token: bearerToken,
      body: payloads.invoiceCreate,
    });
    assert2xx(invoiceCreate, 'gateway create invoice profile');
    const invoiceProfile = itemFromResponse(invoiceCreate.data, 'invoiceProfile');
    created.invoiceProfileId = invoiceProfile?.id;
    if (!created.invoiceProfileId) throw new Error('invoice create response missing id');
    steps.push({ method: 'POST', path: paths.invoiceProfiles, statusCode: invoiceCreate.statusCode, idHash: hashId(created.invoiceProfileId) });

    const invoiceUpdate = await request(baseUrl, `${paths.invoiceProfiles}/${encodeURIComponent(created.invoiceProfileId)}`, {
      method: 'PATCH',
      token: bearerToken,
      body: payloads.invoiceUpdate,
    });
    assert2xx(invoiceUpdate, 'gateway update invoice profile');
    steps.push({ method: 'PATCH', path: `${paths.invoiceProfiles}/:id`, statusCode: invoiceUpdate.statusCode, idHash: hashId(created.invoiceProfileId) });

    const invoiceDefault = await request(baseUrl, `${paths.invoiceProfiles}/${encodeURIComponent(created.invoiceProfileId)}/default`, {
      method: 'POST',
      token: bearerToken,
    });
    assert2xx(invoiceDefault, 'gateway default invoice profile');
    const defaultInvoice = itemFromResponse(invoiceDefault.data, 'invoiceProfile');
    assertions.invoiceDefaultSelected = defaultInvoice?.id === created.invoiceProfileId && defaultInvoice?.isDefault === true;
    steps.push({ method: 'POST', path: `${paths.invoiceProfiles}/:id/default`, statusCode: invoiceDefault.statusCode, idHash: hashId(created.invoiceProfileId) });

    const checkoutAfterDefaults = await request(baseUrl, paths.checkoutData, { token: bearerToken });
    assert2xx(checkoutAfterDefaults, 'gateway checkout-data after defaults');
    steps.push({ method: 'GET', path: paths.checkoutData, statusCode: checkoutAfterDefaults.statusCode });
    const checkoutPayload = checkoutAfterDefaults.data?.data || checkoutAfterDefaults.data || {};
    assertions.deliveryVisibleInCheckoutData = Boolean(findById(checkoutPayload.deliveryAddresses, created.deliveryAddressId));
    assertions.invoiceVisibleInCheckoutData = Boolean(findById(checkoutPayload.invoiceProfiles, created.invoiceProfileId));
    assertions.checkoutDeliveryDefaultSelected = checkoutPayload.defaults?.deliveryAddressId === created.deliveryAddressId;
    assertions.checkoutInvoiceDefaultSelected = checkoutPayload.defaults?.invoiceProfileId === created.invoiceProfileId;
  } finally {
    assertions.cleanup = await cleanup(baseUrl, bearerToken, created, steps);
  }

  const deliveryList = created.deliveryAddressId ? await request(baseUrl, paths.deliveryAddresses, { token: bearerToken }) : null;
  const invoiceList = created.invoiceProfileId ? await request(baseUrl, paths.invoiceProfiles, { token: bearerToken }) : null;
  if (deliveryList) {
    assert2xx(deliveryList, 'gateway delivery list after cleanup');
    steps.push({ method: 'GET', path: paths.deliveryAddresses, statusCode: deliveryList.statusCode });
    assertions.deliveryAddressAbsentAfterCleanup = !findById(listFromResponse(deliveryList.data, 'deliveryAddresses'), created.deliveryAddressId);
  }
  if (invoiceList) {
    assert2xx(invoiceList, 'gateway invoice list after cleanup');
    steps.push({ method: 'GET', path: paths.invoiceProfiles, statusCode: invoiceList.statusCode });
    assertions.invoiceProfileAbsentAfterCleanup = !findById(listFromResponse(invoiceList.data, 'invoiceProfiles'), created.invoiceProfileId);
  }

  const cleanupOk = assertions.cleanup.every((entry) => entry.ok);
  const ok = Boolean(
    assertions.checkoutDataViaFlipFlopGateway &&
      assertions.deliveryDefaultSelected &&
      assertions.invoiceDefaultSelected &&
      assertions.deliveryVisibleInCheckoutData &&
      assertions.invoiceVisibleInCheckoutData &&
      assertions.checkoutDeliveryDefaultSelected &&
      assertions.checkoutInvoiceDefaultSelected &&
      assertions.deliveryAddressAbsentAfterCleanup &&
      assertions.invoiceProfileAbsentAfterCleanup &&
      cleanupOk,
  );

  return {
    ok,
    status: ok ? 'pass_flipflop_auth_wallet_gateway_smoke' : 'fail_flipflop_auth_wallet_gateway_assertions',
    baseUrl: baseUrl.origin,
    steps,
    assertions,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const sourceAssertions = runSourceVerifiers(options.skipSourceVerifiers);
  const missing = liveGateMissing(options);
  if (missing.length > 0) {
    console.log(JSON.stringify(
      {
        ok: true,
        status: 'approval_required_no_live_mutation',
        missing,
        baseUrl: normalizeBaseUrl(options.baseUrl).origin,
        sourceAssertions,
        wouldCallWhenApproved: [
          `GET ${paths.checkoutPage}`,
          `GET ${paths.profileAddressesPage}`,
          `GET ${paths.profileInvoiceProfilesPage}`,
          `GET ${paths.checkoutData}`,
          `POST/PATCH/POST default/DELETE ${paths.deliveryAddresses}`,
          `POST/PATCH/POST default/DELETE ${paths.invoiceProfiles}`,
        ],
        browserSessionUiProof: '[MISSING: owner-approved authenticated browser/session smoke for delayed wallet response and selector interaction]',
        sensitiveData: {
          liveRequestSent: false,
          sendsAuthorizationHeader: false,
          sendsCookies: false,
          sendsRequestBody: false,
          printsToken: false,
          printsRequestBody: false,
          printsResponseBody: false,
          readsDatabase: false,
          submitsCheckoutOrder: false,
        },
      },
      null,
      2,
    ));
    return;
  }

  const runtime = await executeRuntime(options);
  const result = {
    ...runtime,
    sourceAssertions,
    browserSessionUiProof: '[MISSING: owner-approved authenticated browser/session smoke for delayed wallet response and selector interaction]',
    sensitiveData: {
      sendsAuthorizationHeader: true,
      sendsCookies: false,
      sendsSyntheticRequestBodies: true,
      printsToken: false,
      printsRequestBody: false,
      printsResponseBody: false,
      readsDatabase: false,
      submitsCheckoutOrder: false,
      usesSyntheticWalletRowsOnly: true,
    },
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    status: 'flipflop_auth_wallet_smoke_error',
    message: error.message,
    sensitiveData: {
      printsToken: false,
      printsResponseBody: false,
      readsDatabase: false,
      submitsCheckoutOrder: false,
    },
  }, null, 2));
  process.exitCode = 1;
});
