#!/usr/bin/env node
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const orderService = read('services/order-service/src/orders/orders.service.ts');
const packet = read('docs/orchestrator/2026-07-06-customer-journey-sandbox-runtime-packet.md');
const monitorDoc = read('docs/orchestrator/2026-07-06-synthetic-customer-journey-monitor.md');
const packageJson = JSON.parse(read('package.json'));

assert(packageJson.scripts['verify:customer-journey-sandbox-payment-contract'] === 'node scripts/verify-customer-journey-sandbox-payment-contract.js', 'package script is missing');

for (const marker of [
  'PAYMENT_SANDBOX_CONTRACT_APPROVED=1',
  'TEST_MODE_PAYMENT_PROVIDER=invoice',
  'CHECKOUT_MUTATION_MODE=test-only',
  'flipflop.payment.invoice.bank_transfer.no_provider_call.v1',
  'paymentMethod=invoice',
  'provider_call=false',
  'external_provider_call=false',
  'real_money_movement=false',
]) {
  assert(packet.includes(marker), `runtime packet missing marker ${marker}`);
}

for (const marker of [
  'PAYMENT_SANDBOX_CONTRACT_APPROVED=1',
  'TEST_MODE_PAYMENT_PROVIDER=invoice',
  'CHECKOUT_MUTATION_MODE=test-only',
]) {
  assert(monitorDoc.includes(marker), `monitor doc missing marker ${marker}`);
}

assert(orderService.includes("const allowed = new Set(['invoice', 'webpay', 'stripe', 'paypal', 'payu', 'fiobanka'])"), 'invoice must remain an allowed guest payment method');
assert(orderService.includes("if (paymentMethod === 'invoice')"), 'invoice branch missing');
assert(orderService.includes('redirectUrl = this.buildBankTransferRedirect(order, total)'), 'invoice branch must build local bank-transfer redirect');
assert(orderService.includes('paymentResult = await this.paymentService.createPayment'), 'non-invoice provider branch marker missing');
const invoiceBranchStart = orderService.indexOf("if (paymentMethod === 'invoice')");
const providerCreateAfterInvoice = orderService.indexOf('paymentResult = await this.paymentService.createPayment', invoiceBranchStart);
assert(providerCreateAfterInvoice > invoiceBranchStart, 'guest non-invoice provider createPayment branch missing after invoice branch');

const elseBranchStart = orderService.indexOf('} else {', invoiceBranchStart);
const invoiceBranch = orderService.slice(invoiceBranchStart, elseBranchStart);
assert(!invoiceBranch.includes('paymentService.createPayment'), 'invoice branch must not call paymentService.createPayment');
assert(!invoiceBranch.includes('provider'), 'invoice branch must not introduce provider handling');

console.log(JSON.stringify({
  ok: true,
  sourceOnly: true,
  paymentSandboxContractApproved: true,
  testModePaymentProvider: 'invoice',
  checkoutMutationMode: 'test-only',
  providerCall: false,
  externalProviderCall: false,
  realMoneyMovement: false,
  paymentStatusAssertion: 'pending',
  paymentSuccessEvidence: 'not_provided_by_invoice_contract',
  runtimeMutation: false
}, null, 2));
