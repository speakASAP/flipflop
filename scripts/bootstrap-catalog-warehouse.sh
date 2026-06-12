#!/bin/bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-statex-apps}"
POSTGRES_DEPLOYMENT="${POSTGRES_DEPLOYMENT:-deploy/db-server-postgres}"
POSTGRES_USER="${POSTGRES_USER:-dbadmin}"
CATALOG_DB="${CATALOG_DB:-catalog_db}"
WAREHOUSE_DB="${WAREHOUSE_DB:-warehouse_db}"

run_psql() {
  local db="$1"
  kubectl -n "$NAMESPACE" exec -i "$POSTGRES_DEPLOYMENT" -- psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$db"
}

echo "Applying catalog schema and seed data to ${CATALOG_DB}..."
run_psql "$CATALOG_DB" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  slug varchar(200) NOT NULL UNIQUE,
  description text,
  parent_id uuid REFERENCES categories(id),
  path varchar(1000),
  level integer NOT NULL DEFAULT 0,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "seoData" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku varchar(100) NOT NULL UNIQUE,
  title varchar(500) NOT NULL,
  description text,
  brand varchar(200),
  manufacturer varchar(200),
  ean varchar(50),
  "weightKg" numeric(10,3),
  "dimensionsCm" jsonb,
  "isActive" boolean NOT NULL DEFAULT true,
  "seoData" jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_categories (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type varchar(50) NOT NULL,
  url varchar(1000) NOT NULL,
  "thumbnailUrl" varchar(1000),
  "altText" varchar(500),
  title varchar(200),
  position integer NOT NULL DEFAULT 0,
  "isPrimary" boolean NOT NULL DEFAULT false,
  metadata jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "basePrice" numeric(10,2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'CZK',
  "costPrice" numeric(10,2),
  "marginPercent" numeric(5,2),
  "salePrice" numeric(10,2),
  "validFrom" timestamp,
  "validTo" timestamp,
  "isActive" boolean NOT NULL DEFAULT true,
  "priceType" varchar(50) NOT NULL DEFAULT 'regular',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  code varchar(200) NOT NULL UNIQUE,
  type varchar(50) NOT NULL,
  unit varchar(50),
  "allowedValues" jsonb,
  "isRequired" boolean NOT NULL DEFAULT false,
  "isFilterable" boolean NOT NULL DEFAULT true,
  "isSearchable" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES attributes(id),
  value text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, attribute_id)
);

INSERT INTO categories (id, name, slug, description, path, level, "sortOrder", "seoData") VALUES
  ('11111111-1111-4111-8111-111111111111', 'Móda', 'moda', 'Oblečení, obuv a doplňky pro každodenní použití.', '/moda', 0, 10, '{"metaTitle":"Móda | FlipFlop"}'),
  ('22222222-2222-4222-8222-222222222222', 'Domácnost', 'domacnost', 'Praktické vybavení do domácnosti.', '/domacnost', 0, 20, '{"metaTitle":"Domácnost | FlipFlop"}'),
  ('33333333-3333-4333-8333-333333333333', 'Elektronika', 'elektronika', 'Užitečná spotřební elektronika a příslušenství.', '/elektronika', 0, 30, '{"metaTitle":"Elektronika | FlipFlop"}'),
  ('44444444-4444-4444-8444-444444444444', 'Sport', 'sport', 'Sportovní a volnočasové vybavení.', '/sport', 0, 40, '{"metaTitle":"Sport | FlipFlop"}')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  path = EXCLUDED.path,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = now();

INSERT INTO products (id, sku, title, description, brand, manufacturer, "weightKg", "dimensionsCm", "seoData", tags) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'FF-SANDAL-001', 'Lehké letní pantofle Flip Basic', 'Pohodlné unisex pantofle pro běžné letní nošení, bazén i zahradu.', 'FlipFlop', 'FlipFlop', 0.420, '{"length":32,"width":22,"height":11}', '{"slug":"lehke-letni-pantofle-flip-basic","metaTitle":"Lehké letní pantofle Flip Basic"}', ARRAY['obuv','leto','skladem']),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'FF-BAG-TRAVEL-002', 'Skládací cestovní taška 35 l', 'Lehká cestovní taška s voděodolnou úpravou a samostatnou kapsou na obuv.', 'Travelio', 'Travelio', 0.650, '{"length":48,"width":28,"height":26}', '{"slug":"skladaci-cestovni-taska-35l","metaTitle":"Skládací cestovní taška 35 l"}', ARRAY['cestovani','taska','skladem']),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'FF-LED-LAMP-003', 'Stolní LED lampa s USB-C', 'Úsporná stolní lampa s nastavitelnou intenzitou světla a USB-C napájením.', 'Luma', 'Luma', 0.900, '{"length":18,"width":18,"height":42}', '{"slug":"stolni-led-lampa-usbc","metaTitle":"Stolní LED lampa s USB-C"}', ARRAY['domacnost','svetlo','skladem']),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'FF-BOTTLE-SPORT-004', 'Sportovní láhev 750 ml', 'Odolná BPA-free láhev s pojistkou proti vytečení.', 'ActivePro', 'ActivePro', 0.210, '{"length":8,"width":8,"height":26}', '{"slug":"sportovni-lahev-750ml","metaTitle":"Sportovní láhev 750 ml"}', ARRAY['sport','lahev','skladem']),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'FF-CHARGER-USB-005', 'Rychlonabíječka USB-C 30 W', 'Kompaktní síťová nabíječka pro telefony, tablety a drobnou elektroniku.', 'Voltix', 'Voltix', 0.120, '{"length":7,"width":4,"height":3}', '{"slug":"rychlonabijecka-usbc-30w","metaTitle":"Rychlonabíječka USB-C 30 W"}', ARRAY['elektronika','nabijecka','skladem']),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 'FF-TOWEL-MICRO-006', 'Rychleschnoucí ručník z mikrovlákna', 'Kompaktní ručník vhodný na sport, cestování a pláž.', 'ActivePro', 'ActivePro', 0.180, '{"length":30,"width":18,"height":6}', '{"slug":"rychleschnouci-rucnik-mikrovlakno","metaTitle":"Rychleschnoucí ručník z mikrovlákna"}', ARRAY['sport','cestovani','skladem'])
ON CONFLICT (sku) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  brand = EXCLUDED.brand,
  manufacturer = EXCLUDED.manufacturer,
  "weightKg" = EXCLUDED."weightKg",
  "dimensionsCm" = EXCLUDED."dimensionsCm",
  "seoData" = EXCLUDED."seoData",
  tags = EXCLUDED.tags,
  "isActive" = true,
  "updatedAt" = now();

INSERT INTO product_categories (product_id, category_id) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '22222222-2222-4222-8222-222222222222'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '44444444-4444-4444-8444-444444444444'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '33333333-3333-4333-8333-333333333333'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', '44444444-4444-4444-8444-444444444444')
ON CONFLICT DO NOTHING;

INSERT INTO product_pricing (product_id, "basePrice", "costPrice", "marginPercent", "salePrice", currency, "priceType", "isActive") VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 249.00, 110.00, 55.82, NULL, 'CZK', 'regular', true),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 399.00, 190.00, 52.38, 349.00, 'CZK', 'sale', true),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 699.00, 365.00, 47.78, NULL, 'CZK', 'regular', true),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 189.00, 72.00, 61.90, NULL, 'CZK', 'regular', true),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 329.00, 150.00, 54.41, NULL, 'CZK', 'regular', true),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 229.00, 95.00, 58.52, NULL, 'CZK', 'regular', true)
ON CONFLICT DO NOTHING;

INSERT INTO media (product_id, type, url, "altText", title, position, "isPrimary", metadata) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'image', 'https://placehold.co/900x900/e8f3ff/1f2937?text=Flip+Basic', 'Lehké letní pantofle Flip Basic', 'Flip Basic', 0, true, '{"width":900,"height":900,"mimeType":"image/png"}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'image', 'https://placehold.co/900x900/f2fce8/1f2937?text=Cestovni+taska', 'Skládací cestovní taška 35 l', 'Cestovní taška', 0, true, '{"width":900,"height":900,"mimeType":"image/png"}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'image', 'https://placehold.co/900x900/fff7ed/1f2937?text=LED+lampa', 'Stolní LED lampa s USB-C', 'LED lampa', 0, true, '{"width":900,"height":900,"mimeType":"image/png"}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'image', 'https://placehold.co/900x900/ecfeff/1f2937?text=Sportovni+lahev', 'Sportovní láhev 750 ml', 'Sportovní láhev', 0, true, '{"width":900,"height":900,"mimeType":"image/png"}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'image', 'https://placehold.co/900x900/f5f3ff/1f2937?text=USB-C+30W', 'Rychlonabíječka USB-C 30 W', 'USB-C nabíječka', 0, true, '{"width":900,"height":900,"mimeType":"image/png"}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 'image', 'https://placehold.co/900x900/fdf2f8/1f2937?text=Rucnik', 'Rychleschnoucí ručník z mikrovlákna', 'Ručník z mikrovlákna', 0, true, '{"width":900,"height":900,"mimeType":"image/png"}')
ON CONFLICT DO NOTHING;
SQL

echo "Applying warehouse schema and seed data to ${WAREHOUSE_DB}..."
run_psql "$WAREHOUSE_DB" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  code varchar(100) NOT NULL UNIQUE,
  type varchar(50) NOT NULL,
  address text,
  city varchar(100),
  "postalCode" varchar(20),
  country varchar(2),
  "contactEmail" varchar(200),
  "contactPhone" varchar(50),
  "supplierId" varchar,
  "isActive" boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" varchar NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  quantity integer NOT NULL DEFAULT 0,
  reserved integer NOT NULL DEFAULT 0,
  available integer NOT NULL DEFAULT 0,
  "lowStockThreshold" integer NOT NULL DEFAULT 5,
  location varchar(100),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("productId", warehouse_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" varchar NOT NULL,
  type varchar(50) NOT NULL,
  quantity integer NOT NULL,
  from_warehouse_id uuid REFERENCES warehouses(id),
  to_warehouse_id uuid REFERENCES warehouses(id),
  reference varchar(200),
  reason text,
  "createdBy" varchar(200),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" varchar NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  quantity integer NOT NULL,
  "orderId" varchar(200) NOT NULL,
  channel varchar(100) NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'active',
  "expiresAt" timestamp,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO warehouses (id, name, code, type, address, city, "postalCode", country, "contactEmail", "isActive", priority) VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'FlipFlop hlavní sklad', 'FF-MAIN', 'own', 'Testovací 1', 'Praha', '11000', 'CZ', 'test@example.com', true, 1)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  "postalCode" = EXCLUDED."postalCode",
  country = EXCLUDED.country,
  "isActive" = true,
  priority = EXCLUDED.priority,
  "updatedAt" = now();

INSERT INTO stock ("productId", warehouse_id, quantity, reserved, available, "lowStockThreshold", location) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 42, 0, 42, 5, 'A-01'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 18, 0, 18, 5, 'A-02'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 12, 0, 12, 3, 'B-01'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 55, 0, 55, 8, 'B-02'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 30, 0, 30, 5, 'C-01'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 25, 0, 25, 5, 'C-02')
ON CONFLICT ("productId", warehouse_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  reserved = EXCLUDED.reserved,
  available = EXCLUDED.available,
  "lowStockThreshold" = EXCLUDED."lowStockThreshold",
  location = EXCLUDED.location,
  "updatedAt" = now();
SQL

echo "Bootstrap complete."
