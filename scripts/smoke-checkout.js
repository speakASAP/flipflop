#!/usr/bin/env node
const fs = require('fs');
const { execFileSync } = require('child_process');

const baseUrl = process.env.BASE_URL || 'https://flipflop.alfares.cz/api';
const email = process.env.TEST_EMAIL || 'test@example.com';
const authEnvPath = process.env.AUTH_ENV_PATH || '/home/ssf/Documents/Github/auth-microservice/.env';
const paymentMethod = process.env.SMOKE_PAYMENT_METHOD || 'stripe';

function readEnvFile(path) {
  const out = {};
  if (!fs.existsSync(path)) return out;
  const text = fs.readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    value = value.replace(/^["']|["']$/g, '');
    out[key] = value;
  }
  return out;
}

function b64UrlDecode(value) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok || body.success === false) {
    const message = body?.error?.message || body?.message || text || response.statusText;
    const err = new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${message}`);
    err.body = body;
    throw err;
  }
  return body;
}

function psql(sql) {
  execFileSync('kubectl', [
    '-n',
    'statex-apps',
    'exec',
    'deploy/db-server-postgres',
    '--',
    'psql',
    '-U',
    'dbadmin',
    '-d',
    'flipflop',
    '-v',
    'ON_ERROR_STOP=1',
    '-q',
  ], { input: sql, stdio: ['pipe', 'pipe', 'pipe'] });
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  const authEnv = readEnvFile(authEnvPath);
  const flipEnv = readEnvFile('/home/ssf/Documents/Github/flipflop-service/.env');
  const password = process.env.TEST_PASSWORD || authEnv.TEST_PASSWORD || authEnv.TEST_LOGIN_PASSWORD || flipEnv.TEST_PASSWORD;
  if (!password) throw new Error('No test password found. Set TEST_PASSWORD or provide auth microservice .env.');

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = login.data?.accessToken || login.data?.token || login.accessToken || login.token;
  if (!token) throw new Error('Login succeeded but no access token was returned.');

  const payload = JSON.parse(b64UrlDecode(token.split('.')[1]));
  const userId = payload.sub || payload.id || payload.userId;
  if (!userId) throw new Error('JWT has no user id claim.');

  const productsResponse = await request('/products?limit=20');
  const products = productsResponse.data?.items || [];
  if (!products.length) throw new Error('No products returned from public API.');

  const values = products.map((product) => {
    const imageUrls = JSON.stringify(product.imageUrls || product.images || []);
    return `(
      ${sqlString(product.id)}::uuid,
      ${sqlString(product.id)}::uuid,
      ${sqlString(product.name)},
      ${sqlString(product.sku)},
      ${sqlString(product.description || '')},
      ${sqlString(product.description || '')},
      ${Number(product.price || 0).toFixed(2)},
      ${sqlString(product.mainImageUrl || null)},
      ${sqlString(imageUrls)}::jsonb,
      ${Number(product.stockQuantity || 0)},
      true,
      true,
      ${sqlString(product.brand || null)},
      now(),
      now()
    )`;
  }).join(',\n');

  psql(`
    INSERT INTO users (id, email, password, "firstName", "lastName", "isEmailVerified", "isAdmin", "createdAt", "updatedAt")
    VALUES (${sqlString(userId)}::uuid, ${sqlString(email)}, 'external-auth-user', 'Test', 'User', true, false, now(), now())
    ON CONFLICT (email) DO UPDATE SET
      id = EXCLUDED.id,
      "firstName" = EXCLUDED."firstName",
      "lastName" = EXCLUDED."lastName",
      "updatedAt" = now();

    INSERT INTO products (
      id, "catalogProductId", name, sku, description, "shortDescription", price, "mainImageUrl",
      "imageUrls", "stockQuantity", "trackInventory", "isActive", brand, "createdAt", "updatedAt"
    )
    VALUES ${values}
    ON CONFLICT (sku) DO UPDATE SET
      id = EXCLUDED.id,
      "catalogProductId" = EXCLUDED."catalogProductId",
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      "mainImageUrl" = EXCLUDED."mainImageUrl",
      "imageUrls" = EXCLUDED."imageUrls",
      "stockQuantity" = EXCLUDED."stockQuantity",
      "trackInventory" = true,
      "isActive" = true,
      brand = EXCLUDED.brand,
      "updatedAt" = now();
  `);

  const authHeaders = { authorization: `Bearer ${token}` };
  const addresses = await request('/users/addresses', { headers: authHeaders });
  let address = (addresses.data || [])[0];
  if (!address) {
    const created = await request('/users/addresses', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        street: 'Testovaci 1',
        city: 'Praha',
        postalCode: '11000',
        country: 'Czech Republic',
        phone: '+420000000000',
        isDefault: true,
      }),
    });
    address = created.data;
  }

  await request('/cart', { method: 'DELETE', headers: authHeaders });
  const product =
    products.find((item) => Number(item.stockQuantity || 0) > 0 && Number(item.price || 0) > 0) ||
    products.find((item) => Number(item.stockQuantity || 0) > 0) ||
    products[0];
  const cartItem = await request('/cart/items', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ productId: product.id, quantity: 1 }),
  });
  const cart = await request('/cart', { headers: authHeaders });
  if (!cart.data?.items?.length) throw new Error('Cart is empty after add.');

  const orderResult = await request('/orders', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      deliveryAddressId: address.id,
      paymentMethod,
      shippingCost: 0,
      notes: 'Automated production-readiness smoke test',
    }),
  });

  const order = orderResult.data?.order || orderResult.data;
  if (!order?.id) throw new Error('Order creation response did not include an order id.');
  if (!orderResult.data?.redirectUrl) throw new Error('Order creation did not include a payment redirect URL.');

  console.log(JSON.stringify({
    ok: true,
    userId,
    productCount: products.length,
    cartItemId: cartItem.data?.id,
    cartTotal: cart.data.total,
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    redirectUrlPresent: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});
