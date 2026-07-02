#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const frontendAuth = read('services/frontend/lib/api/auth.ts');
const sharedAuthService = read('shared/auth/auth.service.ts');
const profilePage = read('services/frontend/app/profile/page.tsx');
const invoicePage = read('services/frontend/app/profile/invoice-profiles/page.tsx');

assert(frontendAuth.includes('async setDefaultDeliveryAddress(id: string)') && frontendAuth.includes('apiClient.post<AuthDeliveryAddress>(`${AUTH_DELIVERY_ADDRESSES_PATH}/${encodeURIComponent(id)}/default`)'), 'frontend auth client must use POST for default delivery address');
assert(frontendAuth.includes('async setDefaultInvoiceProfile(id: string)') && frontendAuth.includes('apiClient.post<AuthInvoiceProfile>(`${AUTH_INVOICE_PROFILES_PATH}/${encodeURIComponent(id)}/default`)'), 'frontend auth client must use POST for default invoice profile');
assert(!frontendAuth.includes('apiClient.patch<AuthDeliveryAddress>(`${AUTH_DELIVERY_ADDRESSES_PATH}/${encodeURIComponent(id)}/default`)'), 'frontend auth client must not PATCH default delivery endpoint');
assert(!frontendAuth.includes('apiClient.patch<AuthInvoiceProfile>(`${AUTH_INVOICE_PROFILES_PATH}/${encodeURIComponent(id)}/default`)'), 'frontend auth client must not PATCH default invoice endpoint');
assert(sharedAuthService.includes("'POST',\n      `/auth/profile/delivery-addresses/${encodeURIComponent(id)}/default`"), 'shared auth service must use POST for default delivery address');
assert(sharedAuthService.includes("'POST',\n      `/auth/profile/invoice-profiles/${encodeURIComponent(id)}/default`"), 'shared auth service must use POST for default invoice profile');

assert(profilePage.includes('href="/profile/invoice-profiles"'), 'profile page must link to invoice profile management');
assert(invoicePage.includes("import { authApi, AuthInvoiceProfile, AuthInvoiceProfileType, CreateAuthInvoiceProfileData } from '@/lib/api/auth'"), 'invoice page must use Auth invoice profile types/client');
assert(invoicePage.includes('authApi.getInvoiceProfiles()'), 'invoice page must list Auth invoice profiles');
assert(invoicePage.includes('authApi.createInvoiceProfile(payload)'), 'invoice page must create Auth invoice profiles');
assert(invoicePage.includes('authApi.updateInvoiceProfile(editingId, payload)'), 'invoice page must update Auth invoice profiles');
assert(invoicePage.includes('authApi.deleteInvoiceProfile(id)'), 'invoice page must delete Auth invoice profiles');
assert(invoicePage.includes('authApi.setDefaultInvoiceProfile'), 'invoice page must set default Auth invoice profiles');
assert(invoicePage.includes("router.push('/login')"), 'invoice page must require authentication');
assert(!invoicePage.includes('addressesApi'), 'invoice page must not use local address storage');
assert(!invoicePage.includes('ordersApi'), 'invoice page must not write order snapshots');

for (const field of ['companyName', 'companyId', 'taxId', 'vatId', 'email', 'phone', 'street', 'city', 'postalCode', 'country']) {
  assert(invoicePage.includes(field), `invoice page must expose/persist ${field}`);
}

console.log(JSON.stringify({
  ok: true,
  nonMutating: true,
  assertions: {
    defaultEndpointMethods: true,
    profileInvoiceLink: true,
    profileInvoiceCrudUi: true,
    authOwnedStorageOnly: true,
  },
}, null, 2));
