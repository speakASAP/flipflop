#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

const packet = read('docs/orchestrator/2026-07-06-customer-journey-sandbox-runtime-packet.md');
const monitorDoc = read('docs/orchestrator/2026-07-06-synthetic-customer-journey-monitor.md');
const status = read('docs/orchestrator/STATUS.md');
const state = read('docs/IMPLEMENTATION_STATE.md');
const orderService = read('services/order-service/src/orders/orders.service.ts');
const frontendOrdersClient = read('services/frontend/lib/api/orders.ts');
const checkoutPage = read('services/frontend/app/checkout/page.tsx');
const notificationService = read('shared/notifications/notification.service.ts');
const packageJson = JSON.parse(read('package.json'));

const syntheticEmail = 'synthetic.customer-journey.w5@example.invalid';
const syntheticDomain = 'example.invalid';

assert(packageJson.scripts['verify:customer-journey-synthetic-contact-contract'] === 'node scripts/verify-customer-journey-synthetic-contact-contract.js', 'package script is missing');

for (const marker of [
  `SYNTHETIC_CUSTOMER_EMAIL=${syntheticEmail}`,
  'SYNTHETIC_CUSTOMER_PHONE=+420000000000',
  'SYNTHETIC_CUSTOMER_FIRST_NAME=Synthetic',
  'SYNTHETIC_CUSTOMER_LAST_NAME=CustomerJourneyW5',
  'SYNTHETIC_CUSTOMER_BILLING_STREET=Synthetic Street 1',
  'SYNTHETIC_CUSTOMER_BILLING_CITY=Praha',
  'SYNTHETIC_CUSTOMER_BILLING_POSTAL_CODE=11000',
  'SYNTHETIC_CUSTOMER_BILLING_COUNTRY=CZ',
  'SYNTHETIC_CUSTOMER_WANTS_ACCOUNT=false',
  'SYNTHETIC_CUSTOMER_MARKETING_CONSENT=false',
]) {
  assert(packet.includes(marker), `runtime packet missing marker ${marker}`);
}

assert(monitorDoc.includes(`SYNTHETIC_CUSTOMER_EMAIL=${syntheticEmail}`), 'monitor doc missing synthetic email value');
assert(status.includes(`SYNTHETIC_CUSTOMER_EMAIL=${syntheticEmail}`), 'STATUS missing synthetic contact update');
assert(state.includes(`SYNTHETIC_CUSTOMER_EMAIL=${syntheticEmail}`), 'IMPLEMENTATION_STATE missing synthetic contact update');
assert(notificationService.includes('SYNTHETIC_EMAIL_ASSERTION_DOMAIN'), 'notification service must require synthetic domain');
assert(notificationService.includes('captured_not_sent'), 'notification service must capture without sending');
assert(packet.includes(`SYNTHETIC_EMAIL_ASSERTION_DOMAIN=${syntheticDomain}`), 'packet must align synthetic contact domain with assertion domain');

for (const marker of [
  'email: string;',
  'phone?: string;',
  'billingAddress: CheckoutAddressData;',
  'deliveryAddress?: CheckoutAddressData;',
  'wantsAccount?: boolean;',
  'marketingConsent?: boolean;',
]) {
  assert(frontendOrdersClient.includes(marker), `frontend order client missing ${marker}`);
}

for (const marker of [
  'email: form.email',
  'phone: form.phone',
  'billingAddress',
  'deliveryAddress',
  'wantsAccount',
  'marketingConsent',
]) {
  assert(checkoutPage.includes(marker), `checkout page missing payload marker ${marker}`);
}

for (const marker of [
  'private normalizeGuestEmail(email: unknown): string',
  "throw new BadRequestException('Valid email is required')",
  'private async createOrUpdateCheckoutCustomer(dto: any, guestEmail: string)',
  "const firstName = this.normalizeGuestText(address.firstName, 'Guest')",
  "const lastName = this.normalizeGuestText(address.lastName, 'Customer')",
  "const phone = this.normalizeGuestText(dto.phone || address.phone, '')",
  "private async createCheckoutAddress(userId: string, rawAddress: any, phone?: string, label = 'billing')",
  'Complete ${label} address is required',
  "accountActivation: dto.wantsAccount === true ? 'magic-link-pending' : 'not-requested'",
]) {
  assert(orderService.includes(marker), `order service missing ${marker}`);
}

console.log(JSON.stringify({
  ok: true,
  sourceOnly: true,
  syntheticCustomerEmailHash: hash(syntheticEmail),
  syntheticCustomerDomain: syntheticDomain,
  wantsAccount: false,
  marketingConsent: false,
  emailSend: false,
  rawCustomerContactEvidence: false,
  runtimeMutation: false
}, null, 2));
