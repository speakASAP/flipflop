#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env'));

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const limitArgIndex = process.argv.indexOf('--limit');
const limit = limitArgIndex === -1 ? 3 : Number(process.argv[limitArgIndex + 1] || 3);
const catalogUrl = (process.env.CATALOG_SERVICE_URL || 'https://catalog.alfares.cz').replace(/\/$/, '');
const aiUrl = (process.env.AI_SERVICE_URL || 'https://ai.alfares.cz').replace(/\/$/, '');
const aiToken = process.env.AI_SERVICE_TOKEN;
const jwtSecret = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET;

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signCatalogToken() {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET or AUTH_JWT_SECRET is required to update catalog drafts.');
  }
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: 'flipflop-goal04-seo-drafts',
    email: 'flipflop-goal04-seo-drafts@internal',
    roles: ['catalog:write', 'internal:catalog-microservice:admin'],
    iat: now,
    exp: now + 900,
  };
  const unsigned = `${base64url(header)}.${base64url(payload)}`;
  const signature = crypto.createHmac('sha256', jwtSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

async function readJson(response, label) {
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${label} returned non-JSON response: ${text.slice(0, 300)}`);
  }
  if (!response.ok || body.success === false) {
    throw new Error(`${label} failed with HTTP ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  }
  return body;
}

async function fetchProducts() {
  const response = await fetch(`${catalogUrl}/api/products?limit=50&isActive=true`);
  const body = await readJson(response, 'catalog product list');
  return Array.isArray(body.data) ? body.data : [];
}

function productFacts(product) {
  const volatileTagPattern = /skladem|vyprod|stock|sleva|slev|doručen|dodán|záruk|certifik|bezpeč/i;
  return {
    id: product.id,
    sku: product.sku,
    title: product.title,
    brand: product.brand || null,
    manufacturer: product.manufacturer || null,
    description: product.description || null,
    categories: Array.isArray(product.categories) ? product.categories.map((category) => category.name).filter(Boolean) : [],
    tags: Array.isArray(product.tags) ? product.tags.filter((tag) => !volatileTagPattern.test(String(tag))) : [],
  };
}

function selectPriorityProducts(products) {
  return products
    .filter((product) => {
      const seo = product.seoData || {};
      return !seo.aiDraft || !seo.metaDescription || !Array.isArray(seo.keywords) || !seo.keywords.length;
    })
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 3);
}

function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`AI response did not include JSON: ${trimmed.slice(0, 300)}`);
  return JSON.parse(match[0]);
}

function normalizeDraft(raw, product) {
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords
    : String(raw.keywords || '')
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean);
  const draft = {
    metaTitle: String(raw.metaTitle || product.title).slice(0, 80),
    metaDescription: String(raw.metaDescription || product.description || product.title).slice(0, 160),
    keywords: keywords.slice(0, 8),
    shortDescription: raw.shortDescription ? String(raw.shortDescription).slice(0, 240) : undefined,
    description: raw.description ? String(raw.description).slice(0, 1200) : undefined,
    reviewStatus: 'draft',
    generatedAt: new Date().toISOString(),
    generator: 'flipflop-goal04-seo-drafts',
    modelTier: 'free',
    sourceProductFacts: productFacts(product),
  };
  const forbiddenPatterns = [
    /\b\d+[,.]?\d*\s*(kč|czk|eur|€)/i,
    /skladem|vyprod|stock/i,
    /doručen|dodán/i,
    /záruk/i,
    /certifik/i,
    /bezpeč/i,
    /sleva|slev/i,
  ];
  const content = [
    draft.metaTitle,
    draft.metaDescription,
    draft.shortDescription,
    draft.description,
    draft.keywords.join(' '),
  ]
    .filter(Boolean)
    .join(' ');
  const matchedPattern = forbiddenPatterns.find((pattern) => pattern.test(content));
  if (matchedPattern) {
    throw new Error(`AI draft contains forbidden volatile/commercial claim: ${matchedPattern.source}`);
  }
  return draft;
}

async function generateDraft(product) {
  if (!aiToken) {
    throw new Error('AI_SERVICE_TOKEN is missing. Refusing to generate or store fake AI content.');
  }
  const facts = productFacts(product);
  const prompt = [
    'Return only JSON with keys metaTitle, metaDescription, keywords, shortDescription, description.',
    'Language: Czech.',
    'Use only these approved product facts. Never mention price, discounts, stock, availability, delivery promises, warranty, safety, or compliance claims.',
    JSON.stringify(facts),
  ].join('\n');
  const response = await fetch(`${aiUrl}/ai/complete`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${aiToken}`,
    },
    body: JSON.stringify({
      model_tier: 'free',
      user_prompt: prompt,
      max_tokens: 600,
      correlation_id: `goal04-seo-${product.id}-${Date.now()}`,
    }),
  });
  const body = await readJson(response, 'AI completion');
  const text = String(body.text || body.content || body.result || '').trim();
  return normalizeDraft(extractJson(text), product);
}

async function updateCatalogDraft(product, draft, token) {
  const currentSeo = product.seoData || {};
  const response = await fetch(`${catalogUrl}/api/products/${product.id}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      seoData: {
        ...currentSeo,
        aiDraft: draft,
      },
    }),
  });
  await readJson(response, `catalog update ${product.id}`);
}

async function main() {
  const products = await fetchProducts();
  const selected = selectPriorityProducts(products);
  console.log(JSON.stringify({
    dryRun,
    catalogUrl,
    aiUrl,
    selected: selected.map((product) => ({
      id: product.id,
      sku: product.sku,
      title: product.title,
      hasExistingSeo: Boolean(product.seoData?.metaTitle || product.seoData?.metaDescription),
      hasDraft: Boolean(product.seoData?.aiDraft),
    })),
  }, null, 2));

  if (dryRun) return;
  if (!selected.length) return;

  const token = signCatalogToken();
  for (const product of selected) {
    const draft = await generateDraft(product);
    await updateCatalogDraft(product, draft, token);
    console.log(JSON.stringify({
      updated: true,
      productId: product.id,
      sku: product.sku,
      reviewStatus: draft.reviewStatus,
      draftKeys: Object.keys(draft).filter((key) => draft[key] !== undefined),
    }));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
