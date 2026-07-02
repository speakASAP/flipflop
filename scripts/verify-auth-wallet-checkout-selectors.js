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

function extractFunction(source, name) {
  const start = source.indexOf(`const ${name} =`);
  assert(start !== -1, `Missing function ${name}`);
  const nextFunction = source.indexOf('\n  const ', start + 1);
  const nextSubmit = source.indexOf('\n  const submitOrder', start + 1);
  const candidates = [nextFunction, nextSubmit].filter((index) => index > start);
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}

function extractSubmitOrder(source) {
  const start = source.indexOf('const submitOrder = async');
  assert(start !== -1, 'Missing submitOrder handler');
  const end = source.indexOf('\n  if (authLoading || !cart)', start);
  assert(end > start, 'Could not isolate submitOrder handler');
  return source.slice(start, end);
}

const checkout = read('services/frontend/app/checkout/page.tsx');
const profileAddresses = read('services/frontend/app/profile/addresses/page.tsx');
const frontendAuth = read('services/frontend/lib/api/auth.ts');
const sharedAuthInterface = read('shared/auth/auth.interface.ts');
const sharedAuthService = read('shared/auth/auth.service.ts');

assert(frontendAuth.includes("const AUTH_CHECKOUT_DATA_PATH = '/auth/profile/checkout-data'"), 'frontend auth client must target checkout-data endpoint');
assert(frontendAuth.includes("const AUTH_DELIVERY_ADDRESSES_PATH = '/auth/profile/delivery-addresses'"), 'frontend auth client must target delivery-addresses endpoint');
assert(frontendAuth.includes("const AUTH_INVOICE_PROFILES_PATH = '/auth/profile/invoice-profiles'"), 'frontend auth client must target invoice-profiles endpoint');
assert(frontendAuth.includes('async getCheckoutData()'), 'frontend auth client must expose getCheckoutData');
assert(frontendAuth.includes('normalizeAuthApiData(response, \'checkoutData\')'), 'frontend auth client must unwrap checkoutData responses');
assert(frontendAuth.includes('normalizeAuthApiData(response, \'deliveryAddresses\')'), 'frontend auth client must unwrap delivery address responses');
assert(frontendAuth.includes('normalizeAuthApiData(response, \'invoiceProfiles\')'), 'frontend auth client must unwrap invoice profile responses');

for (const contract of ['AuthDeliveryAddress', 'AuthInvoiceProfile', 'AuthCheckoutData']) {
  assert(sharedAuthInterface.includes(`interface ${contract}`), `shared auth interface must define ${contract}`);
  assert(frontendAuth.includes(`interface ${contract}`), `frontend auth client must define ${contract}`);
}

assert(sharedAuthService.includes('/auth/profile/checkout-data'), 'shared auth service must call checkout-data endpoint');
assert(sharedAuthService.includes('/auth/profile/delivery-addresses'), 'shared auth service must call delivery-addresses endpoint');
assert(sharedAuthService.includes('/auth/profile/invoice-profiles'), 'shared auth service must call invoice-profiles endpoint');

assert(checkout.includes("import { authApi, AuthDeliveryAddress, AuthInvoiceProfile } from '@/lib/api/auth'"), 'checkout must import Auth wallet client and types');
assert(checkout.includes('const walletAutofillSensitiveFields = new Set<keyof FormState>'), 'checkout must define manual-edit sensitive fields');
for (const field of ['email', 'phone', 'firstName', 'lastName', 'street', 'city', 'postalCode', 'country', 'differentDelivery', 'deliveryStreet', 'deliveryCity', 'deliveryPostalCode']) {
  assert(checkout.includes(`'${field}'`), `wallet sensitive field set must include ${field}`);
}
for (const field of ['companyName', 'companyId', 'taxId', 'vatId', 'invoiceEmail']) {
  assert(checkout.includes(`${field}: string`), `checkout FormState must include invoice field ${field}`);
  assert(checkout.includes(`'${field}'`), `wallet sensitive field set must include invoice field ${field}`);
}

assert(checkout.includes('const [walletDeliveryAddresses, setWalletDeliveryAddresses] = useState<AuthDeliveryAddress[]>([])'), 'checkout must keep Auth delivery address selector state');
assert(checkout.includes('const [walletInvoiceProfiles, setWalletInvoiceProfiles] = useState<AuthInvoiceProfile[]>([])'), 'checkout must keep Auth invoice profile selector state');
assert(checkout.includes('const walletAutofillBlockedRef = useRef(false)'), 'checkout must track manual-edit race guard with a ref');
assert(checkout.includes('const loadAuthWalletCheckoutData = async () =>'), 'checkout must load Auth wallet checkout data asynchronously');
assert(checkout.includes('const response = await authApi.getCheckoutData()'), 'checkout must read Auth wallet checkout data');
assert(checkout.includes('if (cancelled) return'), 'checkout must ignore stale wallet responses after cleanup');
assert(checkout.includes('if (!response.success || !response.data)'), 'checkout must treat Auth wallet failures as optional');
assert(checkout.includes('setWalletDeliveryAddresses([])') && checkout.includes('setWalletInvoiceProfiles([])'), 'checkout must clear selector state on wallet failure');

assert(checkout.includes('const canApplyWalletDefaults = !walletAutofillBlockedRef.current'), 'wallet default application must be blocked after manual edits');
assert(checkout.includes('setSelectedWalletInvoiceProfileId(canApplyWalletDefaults ? defaultInvoiceProfile?.id || \'\' : \'\')'), 'checkout must avoid selecting default invoice profile after manual edit');
assert(checkout.includes('setSelectedWalletDeliveryAddressId(canApplyWalletDefaults ? defaultDeliveryAddress?.id || \'\' : \'\')'), 'checkout must avoid selecting default delivery address after manual edit');
assert(checkout.includes('if (!canApplyWalletDefaults)') && checkout.includes('return;'), 'checkout must stop automatic wallet form merge after manual edit');
assert(checkout.includes('mergeInvoiceProfileIntoForm') && checkout.includes('mergeDeliveryAddressIntoForm'), 'checkout must merge selected wallet entries into existing form fields');
const mergeInvoice = extractFunction(checkout, 'mergeInvoiceProfileIntoForm');
for (const field of ['companyName', 'companyId', 'taxId', 'vatId']) {
  assert(mergeInvoice.includes(`${field}: profile.${field} || current.${field}`), `invoice profile merge must preserve ${field}`);
}
assert(
  mergeInvoice.includes('invoiceEmail: profile.email || current.invoiceEmail || current.email'),
  'invoice profile merge must treat Auth invoice email as checkout invoiceEmail without losing contact email fallback',
);

const markSensitive = extractFunction(checkout, 'markWalletAutofillSensitiveEdit');
assert(markSensitive.includes('walletAutofillBlockedRef.current = true'), 'manual-edit marker must block later automatic wallet defaults');

const updateForm = extractFunction(checkout, 'updateForm');
assert(updateForm.includes('walletAutofillSensitiveFields.has(key)') && updateForm.includes('markWalletAutofillSensitiveEdit()'), 'generic form edits must trip wallet autofill guard');

const updateBillingAddress = extractFunction(checkout, 'updateBillingAddress');
assert(updateBillingAddress.includes('markWalletAutofillSensitiveEdit()'), 'billing address autocomplete edits must trip wallet autofill guard');

const updateDeliveryAddress = extractFunction(checkout, 'updateDeliveryAddress');
assert(updateDeliveryAddress.includes('markWalletAutofillSensitiveEdit()'), 'delivery address autocomplete edits must trip wallet autofill guard');

const selectInvoice = extractFunction(checkout, 'selectWalletInvoiceProfile');
assert(selectInvoice.includes('setSelectedWalletInvoiceProfileId(id)'), 'explicit invoice selector must record selected profile id');
assert(selectInvoice.includes('walletInvoiceProfiles.find') && selectInvoice.includes('mergeInvoiceProfileIntoForm'), 'explicit invoice selector must override form fields from selected Auth profile');
assert(!selectInvoice.includes('walletAutofillBlockedRef'), 'explicit invoice selector must still apply after manual-edit guard');

const selectDelivery = extractFunction(checkout, 'selectWalletDeliveryAddress');
assert(selectDelivery.includes('setSelectedWalletDeliveryAddressId(id)'), 'explicit delivery selector must record selected address id');
assert(selectDelivery.includes('walletDeliveryAddresses.find') && selectDelivery.includes('mergeDeliveryAddressIntoForm'), 'explicit delivery selector must override form fields from selected Auth address');
assert(!selectDelivery.includes('walletAutofillBlockedRef'), 'explicit delivery selector must still apply after manual-edit guard');

assert(checkout.includes('walletInvoiceProfiles.length > 0') && checkout.includes('selectWalletInvoiceProfile(event.target.value)'), 'checkout UI must render invoice selector when Auth profiles exist');
assert(checkout.includes('walletDeliveryAddresses.length > 0') && checkout.includes('selectWalletDeliveryAddress(event.target.value)'), 'checkout UI must render delivery selector when Auth addresses exist');
for (const label of ['Firma', 'IČO', 'Daňové ID', 'DIČ', 'E-mail pro fakturu']) {
  assert(checkout.includes(`Field label="${label}"`), `checkout must expose manual invoice field ${label}`);
}

assert(checkout.includes('const buildInvoiceProfilePayload = (form: FormState, walletProfileCount: number)'), 'checkout must build Auth invoice profile payloads from edited form state');
assert(checkout.includes('const buildDeliveryAddressPayload = (form: FormState, walletAddressCount: number)'), 'checkout must build Auth delivery address payloads from edited form state');
assert(checkout.includes('const upsertWalletEntry = <T extends { id: string }>(entries: T[], entry: T)'), 'checkout must merge saved Auth wallet entries back into selector state');
const saveProfile = extractFunction(checkout, 'saveAuthProfile');
assert(saveProfile.includes('authApi.updateProfile'), 'checkout save must update the canonical Auth profile');
assert(saveProfile.includes('authApi.updateInvoiceProfile') && saveProfile.includes('authApi.createInvoiceProfile'), 'checkout save must update or create Auth invoice profiles explicitly');
assert(saveProfile.includes('authApi.updateDeliveryAddress') && saveProfile.includes('authApi.createDeliveryAddress'), 'checkout save must update or create Auth delivery addresses explicitly');
assert(saveProfile.includes('selectedWalletInvoiceProfileId') && saveProfile.includes('setSelectedWalletInvoiceProfileId(savedInvoiceProfile.id)'), 'checkout save must retain the saved Auth invoice profile selection');
assert(saveProfile.includes('selectedWalletDeliveryAddressId') && saveProfile.includes('setSelectedWalletDeliveryAddressId(savedDeliveryAddress.id)'), 'checkout save must retain the saved Auth delivery address selection');
assert(saveProfile.includes('form.differentDelivery') && saveProfile.includes('buildDeliveryAddressPayload'), 'checkout save must only save delivery-address entries when a separate delivery address is present');
assert(saveProfile.includes('walletSaveFailed'), 'checkout save must surface partial Auth wallet save failures');

const submitOrder = extractSubmitOrder(checkout);
assert(submitOrder.includes('const billingAddress = { firstName: form.firstName'), 'checkout must build an immutable billing snapshot for Orders');
assert(submitOrder.includes('deliveryAddress: form.differentDelivery ?'), 'checkout must build an immutable delivery snapshot for Orders');
for (const field of ['companyName', 'companyId', 'taxId', 'vatId']) {
  assert(submitOrder.includes(`${field}: form.${field}`), `checkout billing snapshot must include ${field}`);
}
assert(
  submitOrder.includes('email: form.invoiceEmail || form.email'),
  'checkout billing snapshot must include invoice recipient email without replacing checkout contact email',
);
assert(submitOrder.includes('const deliveryAddress = { firstName: form.firstName'), 'checkout must build a delivery-only snapshot separately from billing');
assert(!submitOrder.includes('deliveryAddress: form.differentDelivery ? { ...billingAddress'), 'delivery snapshot must not inherit billing-only invoice fields');
assert(!submitOrder.includes('selectedWalletDeliveryAddressId'), 'checkout order payload must not send Auth delivery wallet ids before provenance approval');
assert(!submitOrder.includes('selectedWalletInvoiceProfileId'), 'checkout order payload must not send Auth invoice wallet ids before provenance approval');
assert(!submitOrder.includes('authDeliveryAddressId') && !submitOrder.includes('authInvoiceProfileId'), 'checkout order payload must not invent wallet provenance fields');
assert(!submitOrder.includes('authApi.createDeliveryAddress') && !submitOrder.includes('authApi.createInvoiceProfile'), 'checkout submit must not silently create Auth wallet entries');

assert(profileAddresses.includes("import { authApi, AuthDeliveryAddress, CreateAuthDeliveryAddressData } from '@/lib/api/auth'"), 'profile addresses page must import Auth wallet client');
assert(profileAddresses.includes("type AddressSource = 'auth' | 'local'"), 'profile addresses page must track Auth/local source');
assert(profileAddresses.includes('const authResponse = await authApi.getDeliveryAddresses()'), 'profile addresses page must try Auth wallet listing first');
assert(profileAddresses.includes("setAddressSource('auth')"), 'profile addresses page must mark Auth-backed address lists');
assert(profileAddresses.includes('await loadLocalAddresses()'), 'profile addresses page must fallback to local addresses when Auth wallet is unavailable');
assert(profileAddresses.includes("addressSource === 'auth'") && profileAddresses.includes('authApi.updateDeliveryAddress'), 'profile addresses page must save edits back to Auth for Auth-sourced entries');
assert(profileAddresses.includes('authApi.createDeliveryAddress') && profileAddresses.includes('authApi.deleteDeliveryAddress'), 'profile addresses page must create/delete Auth-sourced entries through Auth wallet');
assert(profileAddresses.includes('addressesApi.createAddress') && profileAddresses.includes('addressesApi.deleteAddress'), 'profile addresses page must preserve local fallback behavior');

console.log(JSON.stringify({
  ok: true,
  nonMutating: true,
  assertions: {
    authWalletClientContract: true,
    checkoutWalletSelectors: true,
    manualEditBeforeWalletResponseGuard: true,
    explicitSelectorOverride: true,
    profileAddressAuthFallback: true,
    checkoutWalletSaveBack: true,
    orderPayloadSnapshotBoundary: true,
  },
}, null, 2));
