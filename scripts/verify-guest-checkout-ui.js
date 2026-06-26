#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const QRCode = require(path.join(__dirname, '..', 'services', 'frontend', 'node_modules', 'qrcode'));

const baseUrl = (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://flipflop.alfares.cz').replace(/\/$/, '');
const evidenceDir = path.join('reports', 'validation', 'guest-checkout-smoke');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function httpOk(url) {
  const response = await fetch(url, { method: 'GET', redirect: 'manual' });
  assert(response.status >= 200 && response.status < 400, `${url} returned HTTP ${response.status}`);
  return response;
}

async function main() {
  const checkout = read('services/frontend/app/checkout/page.tsx');
  const paymentResult = read('services/frontend/app/payment-result/page.tsx');
  const orderApi = read('services/frontend/lib/api/orders.ts');
  const guestDto = read('services/order-service/src/orders/dto/create-guest-order.dto.ts');
  const orderService = read('services/order-service/src/orders/orders.service.ts');
  const gatewayController = read('services/api-gateway/src/gateway/gateway.controller.ts');
  const configmap = read('k8s/configmap.yaml');
  const envExample = read('.env.example');
  const frontendPackage = JSON.parse(read('services/frontend/package.json'));

  assert(checkout.includes('getGuestCart()'), 'Checkout must load guest cart without requiring login');
  assert(!checkout.includes("router.push('/login"), 'Checkout must not hard-redirect guests to login');
  assert(!checkout.includes('authApi.register'), 'Checkout must not register users before order submission');
  assert(!checkout.includes('type="password"') && !checkout.includes('PasswordField'), 'Checkout must not expose password fields');
  assert(checkout.includes('wantsAccount: form.createAccount'), 'Checkout must pass optional account intent as wantsAccount');
  assert(checkout.includes("marketingConsent: false"), 'Checkout must initialize marketingConsent to false');
  assert(checkout.includes("updateForm('marketingConsent', event.target.checked)"), 'Checkout marketing consent checkbox must update the quoted marketingConsent key');
  assert(!checkout.includes('updateForm(marketingConsent'), 'Checkout must not reference an undefined marketingConsent variable');
  assert(checkout.includes('Chci vytvořit účet'), 'Checkout must expose optional account checkbox copy');
  assert(checkout.includes('Doprava') && checkout.includes('Expedice') && checkout.includes('Platba'), 'Checkout must include Czech delivery/payment/expedition sections');
  assert(checkout.includes('Chci zboží doručit v jiný den'), 'Checkout must include different delivery day option');
  assert(checkout.includes('Poděkování operátorům expedice'), 'Checkout must include operator-tip upsell');
  assert(checkout.includes('Souhrn objednávky'), 'Checkout must include order summary');

  assert(orderApi.includes('wantsAccount?: boolean'), 'Frontend order API must include wantsAccount');
  assert(guestDto.includes('wantsAccount?: boolean'), 'Guest order DTO must include wantsAccount');
  assert(orderService.includes("accountActivation: dto.wantsAccount === true ? 'magic-link-pending' : 'not-requested'"), 'Order metadata must preserve account activation intent before integrations run');
  assert(orderService.includes("metadataPatch.accountActivation = 'magic-link-sent'") && orderService.includes("metadataPatch.accountActivation = 'magic-link-failed'"), 'Order integrations must record magic-link sent/failed outcomes');
  assert(gatewayController.includes("@Post('orders/guest')"), 'Gateway must expose guest order endpoint');
  assert(orderService.includes('buildGuestOrderItems') && orderService.includes('Product ${productId} is not available'), 'Guest order path must recalculate/validate product items server-side');

  assert(frontendPackage.dependencies && frontendPackage.dependencies.qrcode, 'Frontend must depend on qrcode for local QR rendering');
  assert(paymentResult.includes("import QRCode from 'qrcode'"), 'Payment result must use local qrcode package');
  assert(paymentResult.includes('buildQrPlatbaPayload'), 'Payment result must build QR Platba payload');
  assert(paymentResult.includes('SPD') && paymentResult.includes('X-VS') && paymentResult.includes('CC:CZK'), 'QR payload must include Czech QR Platba fields');
  assert(paymentResult.includes('[MISSING: production IBAN]'), 'Payment result must expose missing production IBAN state');
  assert(orderService.includes('BANK_TRANSFER_ACCOUNT_NUMBER') && orderService.includes('BANK_TRANSFER_ACCOUNT_IBAN'), 'Order service must read bank-transfer account env');
  assert(configmap.includes('BANK_TRANSFER_ACCOUNT_NUMBER') && configmap.includes('BANK_TRANSFER_ACCOUNT_IBAN'), 'ConfigMap must define bank-transfer env contract');
  assert(envExample.includes('BANK_TRANSFER_ACCOUNT_NUMBER=') && envExample.includes('BANK_TRANSFER_ACCOUNT_IBAN='), '.env.example must document bank-transfer env contract');

  const requiredEvidence = [
    '01-delivery-payment.png',
    '02-delivery-details-filled-guest.png',
    '03-post-deploy-delivery-payment.png',
    '04-post-deploy-details-passwordless.png',
    '05-bank-transfer-missing-iban.png',
    '06-bank-transfer-rendered-qr.png',
    'report-post-deploy.json',
    'report-payment-qr.json',
  ];
  for (const file of requiredEvidence) {
    const fullPath = path.join(evidenceDir, file);
    assert(fs.existsSync(fullPath), `Missing validation evidence ${fullPath}`);
    assert(fs.statSync(fullPath).size > 0, `Validation evidence is empty ${fullPath}`);
  }

  const postDeployReport = JSON.parse(read(path.join(evidenceDir, 'report-post-deploy.json')));
  assert(postDeployReport.assertions.noLoginRedirect === true, 'Post-deploy smoke must prove no login redirect');
  assert(postDeployReport.assertions.noCheckoutPasswordInputs === true, 'Post-deploy smoke must prove no checkout password inputs');
  assert(postDeployReport.assertions.finalSubmitButtonEnabledBeforeClick === true, 'Post-deploy smoke must prove final submit button can be enabled');
  assert(postDeployReport.assertions.finalSubmitNotClickedToAvoidProductionOrderMutation === true, 'Post-deploy smoke must remain non-mutating');

  const qrReport = JSON.parse(read(path.join(evidenceDir, 'report-payment-qr.json')));
  assert(qrReport.assertions.missingIbanPlaceholderRendered === true, 'QR smoke must prove missing-IBAN state');
  assert(qrReport.assertions.configuredIbanRendersQrSvg === true, 'QR smoke must prove configured IBAN renders QR SVG');
  assert(qrReport.assertions.qrUsesLocalClientGenerator === true, 'QR smoke must prove local QR generation');

  const svg = await QRCode.toString('SPD*1.0*ACC:CZ6508000000192000145399*AM:1.00*CC:CZK*X-VS:1*MSG:FlipFlop verifier', { type: 'svg', width: 192 });
  assert(svg.includes('<svg') && svg.length > 1000, 'qrcode package must generate SVG output');

  await httpOk(`${baseUrl}/cart`);
  await httpOk(`${baseUrl}/checkout`);
  await httpOk(`${baseUrl}/payment-result?status=bank-transfer&orderId=verify&orderNumber=FFVERIFY&variableSymbol=1&amount=1`);
  await httpOk(`${baseUrl}/api/products?limit=1`);

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    nonMutating: true,
    assertions: {
      guestCheckoutSourceContract: true,
      optionalRegistrationPasswordless: true,
      deliveryPaymentSummaryUpsell: true,
      backendGuestOrderContract: true,
      paymentQrContract: true,
      savedBrowserEvidencePresent: true,
      liveEndpointsReachable: true,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
