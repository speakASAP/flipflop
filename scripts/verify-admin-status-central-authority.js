const fs = require('fs');
const path = require('path');

const root = process.cwd();
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertContains(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

const service = read('services/order-service/src/orders/orders.service.ts');
const client = read('shared/clients/order-client.service.ts');
const adminPage = read('services/frontend/app/admin/orders/[id]/page.tsx');

assertContains(client, 'applyAdminOrderStatusAction(action: AdminOrderStatusActionRequest)', 'central Orders admin action client');
assertContains(client, "/api/admin/operations/actions/order-status", 'central Orders admin action route');
assertContains(client, 'process.env.ORDERS_STATUS_SERVICE_TOKEN', 'dedicated action-admin token env');
assertContains(client, '[MISSING: approved live action-admin session packet]', 'missing action-admin packet gate');
assertContains(service, 'const centralOrderId = this.getAcceptedCentralOrderId(order);', 'backend central ownership id');
assertContains(service, 'await this.orderClient.applyAdminOrderStatusAction({', 'backend routes central status to Orders');
assertContains(service, 'orderId: centralOrderId!', 'backend uses central Orders id');
assertContains(service, 'approval: dto.approval', 'backend forwards approval packet');
assertContains(service, '[MISSING: payment/refund/provider correction workflow]', 'backend blocks central payment correction');
assertContains(service, 'data: { notes: dto.notes }', 'backend notes-only update remains local');
assertContains(adminPage, 'const display = getOrderDisplayData(response.data);', 'frontend initializes form from central display');
assertContains(adminPage, 'centralStatusChanged', 'frontend avoids accidental notes-only status submission');
assertContains(adminPage, 'status: centralStatusLocked', 'frontend can submit central status changes');
assertContains(adminPage, 'paymentStatus: statusForm.paymentStatus || undefined', 'frontend preserves local payment update for non-central orders');
assertContains(adminPage, 'disabled={updating}', 'frontend central status control is not locked by central authority');
assertContains(adminPage, 'Odeslat do Orders', 'frontend central action label');

console.log(JSON.stringify({
  ok: true,
  checks: [
    'backend routes central-owned status mutation to Orders admin action route',
    'backend keeps central-owned payment mutation fail-closed',
    'backend leaves notes-only update path available',
    'frontend sends changed central status while avoiding notes-only accidental status submit',
    'frontend keeps payment changes local-only for non-central orders',
  ],
  runtimeMutation: false,
  sensitiveOutput: 'redacted-source-only',
}, null, 2));
