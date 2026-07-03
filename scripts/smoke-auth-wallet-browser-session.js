#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_BASE_URL = 'https://flipflop.alfares.cz';
const REQUIRED_CONFIRM = 'BROWSER_SESSION_SELECTOR';
const CHECKOUT_DATA_DELAY_MS = 3000;

const apiPaths = {
  checkoutData: '/api/auth/profile/checkout-data',
  deliveryAddresses: '/api/auth/profile/delivery-addresses',
  invoiceProfiles: '/api/auth/profile/invoice-profiles',
};

function parseArgs(argv) {
  return argv.reduce((options, arg) => {
    if (arg === '--execute') options.execute = true;
    else if (arg.startsWith('--base-url=')) options.baseUrl = arg.slice('--base-url='.length);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
    return options;
  }, { execute: false, baseUrl: process.env.FLIPFLOP_AUTH_WALLET_BROWSER_BASE_URL || DEFAULT_BASE_URL, help: false });
}

function printHelp() {
  console.log(`Usage: node scripts/smoke-auth-wallet-browser-session.js [--execute] [--base-url=https://flipflop.alfares.cz]

Approval-gated FlipFlop Auth wallet browser/session smoke.

Default mode is non-mutating and reports missing approval gates. Live mode requires:
  --execute
  RUN_LIVE_FLIPFLOP_AUTH_WALLET_BROWSER_SMOKE=1
  FLIPFLOP_AUTH_WALLET_BROWSER_SMOKE_APPROVAL_ID=<non-secret approval id>
  FLIPFLOP_AUTH_WALLET_BROWSER_SMOKE_CONFIRM=BROWSER_SESSION_SELECTOR
  FLIPFLOP_AUTH_WALLET_BROWSER_SMOKE_BEARER_TOKEN=<owner-approved synthetic bearer>

Live mode creates synthetic Auth wallet rows through FlipFlop gateway, opens a
headless browser session with the synthetic bearer in localStorage, delays the
checkout-data browser response, proves manual edits survive the delayed wallet
response, proves explicit selectors still apply wallet values, and cleans up.
It does not submit checkout orders or print bearer/payload/response bodies.`);
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

function bearer() {
  return String(process.env.FLIPFLOP_AUTH_WALLET_BROWSER_SMOKE_BEARER_TOKEN || '').trim();
}

function liveGateMissing(options) {
  const missing = [];
  if (!options.execute) missing.push('--execute');
  if (process.env.RUN_LIVE_FLIPFLOP_AUTH_WALLET_BROWSER_SMOKE !== '1') missing.push('RUN_LIVE_FLIPFLOP_AUTH_WALLET_BROWSER_SMOKE=1');
  if (!process.env.FLIPFLOP_AUTH_WALLET_BROWSER_SMOKE_APPROVAL_ID) missing.push('FLIPFLOP_AUTH_WALLET_BROWSER_SMOKE_APPROVAL_ID');
  if (process.env.FLIPFLOP_AUTH_WALLET_BROWSER_SMOKE_CONFIRM !== REQUIRED_CONFIRM) missing.push(`FLIPFLOP_AUTH_WALLET_BROWSER_SMOKE_CONFIRM=${REQUIRED_CONFIRM}`);
  if (!bearer()) missing.push('FLIPFLOP_AUTH_WALLET_BROWSER_SMOKE_BEARER_TOKEN');
  return missing;
}

function hashId(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
}

function syntheticPayloads(runId) {
  return {
    deliveryCreate: {
      label: `browser-delivery-${runId}`,
      firstName: 'Synthetic',
      lastName: 'BrowserDelivery',
      street: `Browser Delivery ${runId}`,
      city: 'Liberec',
      postalCode: '46001',
      country: 'CZ',
      phone: '+420777222000',
      isDefault: true,
    },
    invoiceCreate: {
      label: `browser-invoice-${runId}`,
      type: 'company',
      firstName: 'Synthetic',
      lastName: 'BrowserInvoice',
      companyName: `Browser Smoke Company ${runId}`,
      companyId: '87654321',
      taxId: 'CZ87654321',
      vatId: 'CZ87654321',
      street: `Browser Invoice ${runId}`,
      city: 'Olomouc',
      postalCode: '77900',
      country: 'CZ',
      email: `browser-invoice-${runId}@example.invalid`,
      phone: '+420777222001',
      isDefault: true,
    },
  };
}

async function apiRequest(baseUrl, pathName, options = {}) {
  const response = await fetch(new URL(pathName, baseUrl), {
    method: options.method || 'GET',
    headers: {
      accept: 'application/json',
      'user-agent': 'flipflop-auth-wallet-browser-smoke/1.0',
      ...(options.bearer ? { authorization: `Bearer ${options.bearer}` } : {}),
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let data = null;
  if (text.trim()) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  return { statusCode: response.status, data };
}

function assert2xx(response, label) {
  if (response.statusCode < 200 || response.statusCode > 299) throw new Error(`${label} returned HTTP ${response.statusCode}`);
}

function itemFromResponse(data, key) {
  if (!data || typeof data !== 'object') return null;
  if (data[key]) return data[key];
  if (data.data && typeof data.data === 'object') return data.data[key] || data.data;
  return null;
}

function checkoutPayload(data) {
  if (!data || typeof data !== 'object') return {};
  return data.data && typeof data.data === 'object' ? data.data : data;
}

async function createWalletRows(baseUrl, bearerValue, runId) {
  const payloads = syntheticPayloads(runId);
  const created = {};
  const steps = [];

  const deliveryCreate = await apiRequest(baseUrl, apiPaths.deliveryAddresses, { method: 'POST', bearer: bearerValue, body: payloads.deliveryCreate });
  assert2xx(deliveryCreate, 'create delivery address');
  const deliveryAddress = itemFromResponse(deliveryCreate.data, 'deliveryAddress');
  created.deliveryAddressId = deliveryAddress?.id;
  if (!created.deliveryAddressId) throw new Error('delivery create response missing id');
  steps.push({ method: 'POST', path: apiPaths.deliveryAddresses, statusCode: deliveryCreate.statusCode, idHash: hashId(created.deliveryAddressId) });

  const deliveryDefault = await apiRequest(baseUrl, `${apiPaths.deliveryAddresses}/${encodeURIComponent(created.deliveryAddressId)}/default`, { method: 'POST', bearer: bearerValue });
  assert2xx(deliveryDefault, 'default delivery address');
  steps.push({ method: 'POST', path: `${apiPaths.deliveryAddresses}/:id/default`, statusCode: deliveryDefault.statusCode, idHash: hashId(created.deliveryAddressId) });

  const invoiceCreate = await apiRequest(baseUrl, apiPaths.invoiceProfiles, { method: 'POST', bearer: bearerValue, body: payloads.invoiceCreate });
  assert2xx(invoiceCreate, 'create invoice profile');
  const invoiceProfile = itemFromResponse(invoiceCreate.data, 'invoiceProfile');
  created.invoiceProfileId = invoiceProfile?.id;
  if (!created.invoiceProfileId) throw new Error('invoice create response missing id');
  steps.push({ method: 'POST', path: apiPaths.invoiceProfiles, statusCode: invoiceCreate.statusCode, idHash: hashId(created.invoiceProfileId) });

  const invoiceDefault = await apiRequest(baseUrl, `${apiPaths.invoiceProfiles}/${encodeURIComponent(created.invoiceProfileId)}/default`, { method: 'POST', bearer: bearerValue });
  assert2xx(invoiceDefault, 'default invoice profile');
  steps.push({ method: 'POST', path: `${apiPaths.invoiceProfiles}/:id/default`, statusCode: invoiceDefault.statusCode, idHash: hashId(created.invoiceProfileId) });

  const checkoutData = await apiRequest(baseUrl, apiPaths.checkoutData, { bearer: bearerValue });
  assert2xx(checkoutData, 'checkout-data for browser fixture');
  return { created, steps, checkoutData: checkoutData.data };
}

async function cleanupWalletRows(baseUrl, bearerValue, created, steps) {
  const cleanup = [];
  if (created.deliveryAddressId) {
    const response = await apiRequest(baseUrl, `${apiPaths.deliveryAddresses}/${encodeURIComponent(created.deliveryAddressId)}`, { method: 'DELETE', bearer: bearerValue }).catch((error) => ({ statusCode: 0, error: error.message }));
    steps.push({ method: 'DELETE', path: `${apiPaths.deliveryAddresses}/:id`, statusCode: response.statusCode, idHash: hashId(created.deliveryAddressId) });
    cleanup.push({ resource: 'deliveryAddress', statusCode: response.statusCode, idHash: hashId(created.deliveryAddressId), ok: response.statusCode >= 200 && response.statusCode < 300 });
  }
  if (created.invoiceProfileId) {
    const response = await apiRequest(baseUrl, `${apiPaths.invoiceProfiles}/${encodeURIComponent(created.invoiceProfileId)}`, { method: 'DELETE', bearer: bearerValue }).catch((error) => ({ statusCode: 0, error: error.message }));
    steps.push({ method: 'DELETE', path: `${apiPaths.invoiceProfiles}/:id`, statusCode: response.statusCode, idHash: hashId(created.invoiceProfileId) });
    cleanup.push({ resource: 'invoiceProfile', statusCode: response.statusCode, idHash: hashId(created.invoiceProfileId), ok: response.statusCode >= 200 && response.statusCode < 300 });
  }
  return cleanup;
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP websocket connect timeout')), 10000);
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      this.ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP websocket error')); }, { once: true });
    });
    this.ws.addEventListener('message', (event) => this.onMessage(String(event.data)));
  }

  on(method, handler) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(handler);
  }

  onMessage(raw) {
    const message = JSON.parse(raw);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
      else resolve(message.result || {});
      return;
    }
    if (message.method && this.handlers.has(message.method)) {
      for (const handler of this.handlers.get(message.method)) void handler(message.params || {});
    }
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = { id, method, params, ...(sessionId ? { sessionId } : {}) };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    this.ws?.close();
  }
}

async function launchChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flipflop-wallet-browser-'));
  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const wsUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome DevTools endpoint timeout')), 15000);
    chrome.stderr.setEncoding('utf8');
    chrome.stderr.on('data', (chunk) => {
      const match = String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    chrome.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited before DevTools endpoint was ready: ${code}`));
    });
  });

  return { chrome, userDataDir, wsUrl };
}

function safeRmDir(dirPath) {
  if (!dirPath || !dirPath.startsWith(os.tmpdir())) return;
  try {
    fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch {
    // Chrome may release profile files slightly after process termination; this cleanup is best-effort.
  }
}

function buildProfileFixture() {
  return {
    success: true,
    data: {
      id: 'synthetic-auth-wallet-browser-subject',
      email: 'synthetic-browser@example.invalid',
      firstName: 'Synthetic',
      lastName: 'Browser',
      phone: '+420777222002',
      isAdmin: false,
      profileAddress: {
        firstName: 'Synthetic',
        lastName: 'Browser',
        street: 'Profile Smoke 1',
        city: 'Praha',
        postalCode: '11000',
        country: 'CZ',
        phone: '+420777222002',
      },
    },
  };
}

function buildCartFixture() {
  return {
    success: true,
    data: {
      items: [{
        id: 'browser-session-cart-item',
        productId: 'browser-session-product',
        quantity: 1,
        price: 499,
        product: {
          id: 'browser-session-product',
          name: 'Synthetic Browser Session Product',
          sku: 'BROWSER-SESSION-SMOKE',
          price: 499,
          stockQuantity: 10,
          createdAt: '2026-07-03T00:00:00.000Z',
          updatedAt: '2026-07-03T00:00:00.000Z',
        },
      }],
      total: 499,
      itemCount: 1,
    },
  };
}

async function runBrowserProof(baseUrl, bearerValue, checkoutFixture, created) {
  const launch = await launchChrome();
  const cdp = new CdpClient(launch.wsUrl);
  const intercepted = { checkoutDataDelayed: false, profileFulfilled: false, cartFulfilled: false, orderSubmitAttempted: false };
  const wallet = checkoutPayload(checkoutFixture);
  const expectedCompany = wallet.defaultInvoiceProfile?.companyName || 'Browser Smoke Company';

  try {
    await cdp.connect();
    const target = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const attached = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    const sessionId = attached.sessionId;

    cdp.on('Fetch.requestPaused', async (event) => {
      const requestUrl = new URL(event.request.url);
      const fulfillJson = async (body, delayMs = 0) => {
        if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        await cdp.send('Fetch.fulfillRequest', {
          requestId: event.requestId,
          responseCode: 200,
          responseHeaders: [{ name: 'content-type', value: 'application/json' }],
          body: Buffer.from(JSON.stringify(body)).toString('base64'),
        }, sessionId);
      };

      if (requestUrl.pathname === '/api/users/profile') {
        intercepted.profileFulfilled = true;
        await fulfillJson(buildProfileFixture());
      } else if (requestUrl.pathname === '/api/cart') {
        intercepted.cartFulfilled = true;
        await fulfillJson(buildCartFixture());
      } else if (requestUrl.pathname === apiPaths.checkoutData) {
        intercepted.checkoutDataDelayed = true;
        await fulfillJson(checkoutFixture, CHECKOUT_DATA_DELAY_MS);
      } else if (requestUrl.pathname.includes('/api/orders/')) {
        intercepted.orderSubmitAttempted = true;
        await cdp.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'Aborted' }, sessionId);
      } else {
        await cdp.send('Fetch.continueRequest', { requestId: event.requestId }, sessionId);
      }
    });

    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*://flipflop.alfares.cz/api/*', requestStage: 'Request' }] }, sessionId);
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.localStorage.setItem('auth_token', ${JSON.stringify(bearerValue)});`,
    }, sessionId);

    const evaluate = async (expression) => {
      const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'browser evaluation failed');
      return result.result?.value;
    };
    const waitFor = async (expression, timeoutMs = 10000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (await evaluate(expression)) return true;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(`Timed out waiting for browser condition: ${expression.slice(0, 120)}`);
    };

    await cdp.send('Page.navigate', { url: new URL('/checkout?step=details', baseUrl).toString() }, sessionId);
    await waitFor(`document.body && document.body.innerText.includes('Kontaktní údaje')`);
    await waitFor(`Array.from(document.querySelectorAll('button')).some((button) => button.textContent.includes('Upravit údaje'))`);
    await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Upravit údaje')).click(); true`);

    const manualCompany = 'Manual Browser Guard Company';
    await waitFor(`Array.from(document.querySelectorAll('label')).some((label) => label.textContent.includes('Firma') && label.querySelector('input'))`);
    await waitFor(`Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes('Firma'))?.querySelector('input')?.disabled === false`);
    await evaluate(`(() => {
      const label = Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes('Firma'));
      const input = label.querySelector('input');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(manualCompany)});
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ${JSON.stringify(manualCompany)} }));
      return true;
    })()`);
    await waitFor(`Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes('Firma'))?.querySelector('input')?.value === ${JSON.stringify(manualCompany)}`);

    await waitFor(`Array.from(document.querySelectorAll('label')).some((label) => label.textContent.includes('Fakturační profil') && label.querySelector('select option[value="${created.invoiceProfileId}"]'))`, 15000);

    const afterDelay = await evaluate(`(() => {
      const textInputFor = (needle) => {
        const label = Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes(needle));
        return label?.querySelector('input')?.value || '';
      };
      const selectFor = (needle) => {
        const label = Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes(needle));
        return label?.querySelector('select')?.value || '';
      };
      return {
        companyName: textInputFor('Firma'),
        invoiceSelection: selectFor('Fakturační profil'),
        deliverySelection: selectFor('Dodací adresa'),
      };
    })()`);

    await evaluate(`(() => {
      const label = Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes('Fakturační profil'));
      const select = label.querySelector('select');
      select.value = ${JSON.stringify(created.invoiceProfileId)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    await waitFor(`Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes('Firma'))?.querySelector('input')?.value.includes(${JSON.stringify(expectedCompany)})`);

    await evaluate(`(() => {
      const label = Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes('Dodací adresa'));
      const select = label.querySelector('select');
      select.value = ${JSON.stringify(created.deliveryAddressId)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    await waitFor(`document.body.innerText.includes('Dodací ulice') && Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes('Dodací ulice'))?.querySelector('input')?.value.includes('Browser Delivery')`);

    const finalState = await evaluate(`(() => {
      const inputFor = (needle) => {
        const label = Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes(needle));
        return label?.querySelector('input')?.value || '';
      };
      const selectFor = (needle) => {
        const label = Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes(needle));
        return label?.querySelector('select')?.value || '';
      };
      const checkedFor = (needle) => {
        const label = Array.from(document.querySelectorAll('label')).find((item) => item.textContent.includes(needle));
        return Boolean(label?.querySelector('input[type="checkbox"]')?.checked);
      };
      return {
        companyName: inputFor('Firma'),
        companyId: inputFor('IČO'),
        invoiceEmail: inputFor('E-mail pro fakturu'),
        invoiceSelection: selectFor('Fakturační profil'),
        deliverySelection: selectFor('Dodací adresa'),
        differentDelivery: checkedFor('Dodací údaje jsou jiné než fakturační'),
        deliveryStreet: inputFor('Dodací ulice'),
        deliveryCity: inputFor('Dodací město'),
        deliveryPostalCode: inputFor('Dodací PSČ'),
        submitButtonPresent: Array.from(document.querySelectorAll('button')).some((button) => button.textContent.includes('Odeslat objednávku')),
      };
    })()`);

    return {
      browser: {
        checkoutDataDelayed: intercepted.checkoutDataDelayed,
        profileFulfilled: intercepted.profileFulfilled,
        cartFulfilled: intercepted.cartFulfilled,
        orderSubmitAttempted: intercepted.orderSubmitAttempted,
        manualEditCompanyPreservedAfterDelayedWallet: afterDelay.companyName === manualCompany,
        walletDefaultsNotAutoSelectedAfterManualEdit: afterDelay.invoiceSelection === '' && afterDelay.deliverySelection === '',
        explicitInvoiceSelectorApplied: finalState.invoiceSelection === created.invoiceProfileId && finalState.companyName.includes(expectedCompany) && finalState.companyId === '87654321',
        explicitDeliverySelectorApplied: finalState.deliverySelection === created.deliveryAddressId && finalState.differentDelivery === true && finalState.deliveryStreet.includes('Browser Delivery') && finalState.deliveryCity === 'Liberec' && finalState.deliveryPostalCode === '46001',
        checkoutSubmitButtonPresentButNotClicked: finalState.submitButtonPresent && !intercepted.orderSubmitAttempted,
      },
      hashes: {
        deliveryAddress: hashId(created.deliveryAddressId),
        invoiceProfile: hashId(created.invoiceProfileId),
      },
    };
  } finally {
    cdp.close();
    launch.chrome.kill('SIGTERM');
    safeRmDir(launch.userDataDir);
  }
}

async function executeRuntime(options) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const bearerValue = bearer();
  const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const steps = [];
  let created = {};
  let cleanup = [];
  let browserProof = null;

  try {
    const setup = await createWalletRows(baseUrl, bearerValue, runId);
    created = setup.created;
    steps.push(...setup.steps);
    browserProof = await runBrowserProof(baseUrl, bearerValue, setup.checkoutData, created);
  } finally {
    cleanup = await cleanupWalletRows(baseUrl, bearerValue, created, steps);
  }

  const cleanupOk = cleanup.every((entry) => entry.ok);
  const assertions = { ...browserProof.browser, cleanup, usesSyntheticWalletRowsOnly: true };
  const ok = Boolean(
    assertions.checkoutDataDelayed &&
      assertions.profileFulfilled &&
      assertions.cartFulfilled &&
      assertions.manualEditCompanyPreservedAfterDelayedWallet &&
      assertions.walletDefaultsNotAutoSelectedAfterManualEdit &&
      assertions.explicitInvoiceSelectorApplied &&
      assertions.explicitDeliverySelectorApplied &&
      assertions.checkoutSubmitButtonPresentButNotClicked &&
      !assertions.orderSubmitAttempted &&
      cleanupOk
  );

  return {
    ok,
    status: ok ? 'pass_flipflop_auth_wallet_browser_session_smoke' : 'fail_flipflop_auth_wallet_browser_session_assertions',
    baseUrl: baseUrl.origin,
    steps,
    assertions,
    idHashes: browserProof.hashes,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const missing = liveGateMissing(options);
  if (missing.length > 0) {
    console.log(JSON.stringify({
      ok: true,
      status: 'approval_required_no_live_browser_session',
      missing,
      baseUrl: normalizeBaseUrl(options.baseUrl).origin,
      wouldCallWhenApproved: [
        `POST/POST default/DELETE ${apiPaths.deliveryAddresses}`,
        `POST/POST default/DELETE ${apiPaths.invoiceProfiles}`,
        `GET ${apiPaths.checkoutData}`,
        'GET /checkout?step=details in headless browser',
      ],
      sensitiveData: {
        liveRequestSent: false,
        sendsAuthorizationHeader: false,
        sendsCookies: false,
        printsBearer: false,
        printsRequestBody: false,
        printsResponseBody: false,
        readsDatabase: false,
        submitsCheckoutOrder: false,
      },
    }, null, 2));
    return;
  }

  const runtime = await executeRuntime(options);
  const result = {
    ...runtime,
    sensitiveData: {
      sendsAuthorizationHeader: true,
      sendsCookies: false,
      sendsSyntheticRequestBodies: true,
      printsBearer: false,
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
    status: 'flipflop_auth_wallet_browser_session_smoke_error',
    message: error.message,
    sensitiveData: {
      printsBearer: false,
      printsResponseBody: false,
      readsDatabase: false,
      submitsCheckoutOrder: false,
    },
  }, null, 2));
  process.exitCode = 1;
});
