#!/usr/bin/env node
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');
const { Pool } = require('pg');

const DEFAULT_SOURCE_URL = 'https://services.cuzk.gov.cz/vfr/202604/20260403_ST_UADS.xml.zip';
const DEFAULT_ZIP_PATH = '/tmp/ruian-st-uads.zip';
const columns = [
  'ruian_address_id',
  'district_code',
  'district_name',
  'municipality_code',
  'municipality_name',
  'municipality_part_code',
  'municipality_part_name',
  'street_code',
  'street_name',
  'postal_code',
  'post_name',
  'building_object_code',
  'house_number',
  'orientation_number',
  'address_line1',
  'address_line2',
  'city',
  'street',
  'search_text',
  'source_file',
];

function option(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function xmlDecode(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function tag(block, name) {
  const match = new RegExp(`<${name}>(.*?)</${name}>`).exec(block);
  return match ? xmlDecode(match[1].trim()) : '';
}

function intOrNull(value) {
  const trimmed = String(value || '').trim();
  return trimmed ? Number(trimmed) : null;
}

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPostalCode(value) {
  const compact = String(value || '').replace(/\D/g, '');
  return compact.length === 5 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : compact;
}

function parseAddress(block, sourceFile) {
  const ruianAddressId = intOrNull(tag(block, 'vfa:AdresniMistoKod'));
  if (!ruianAddressId) return null;

  const streetName = tag(block, 'vfa:UliceNazev');
  const houseNumber = tag(block, 'vfa:CisloDomovni');
  const orientationNumber = tag(block, 'vfa:CisloOrientacni');
  const addressLine1 = tag(block, 'vfa:RadekAdresy1') || [streetName || 'č.p.', [houseNumber, orientationNumber].filter(Boolean).join('/')].filter(Boolean).join(' ');
  const postalCode = tag(block, 'vfa:PostaKod').replace(/\D/g, '');
  const postName = tag(block, 'vfa:PostaNazev');
  const municipalityName = tag(block, 'vfa:ObecNazev');
  const addressLine2 = tag(block, 'vfa:RadekAdresy2') || [formatPostalCode(postalCode), postName || municipalityName].filter(Boolean).join(' ');
  const street = streetName || addressLine1;

  return [
    ruianAddressId,
    intOrNull(tag(block, 'vfa:OkresKod')),
    tag(block, 'vfa:OkresNazev'),
    intOrNull(tag(block, 'vfa:ObecKod')),
    municipalityName,
    intOrNull(tag(block, 'vfa:CastObceKod')),
    tag(block, 'vfa:CastObceNazev'),
    intOrNull(tag(block, 'vfa:UliceKod')),
    streetName || null,
    postalCode,
    postName || null,
    intOrNull(tag(block, 'vfa:StavebniObjektKod')),
    houseNumber || null,
    orientationNumber || null,
    addressLine1,
    addressLine2,
    municipalityName,
    street,
    normalize([addressLine1, addressLine2, postalCode, formatPostalCode(postalCode), municipalityName, postName, tag(block, 'vfa:CastObceNazev'), tag(block, 'vfa:OkresNazev')].filter(Boolean).join(' ')),
    sourceFile,
  ];
}

function download(url, target) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} -> ${target}`);
    const file = fs.createWriteStream(target);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(target);
        download(response.headers.location, target).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function insertBatch(pool, rows) {
  if (!rows.length) return;
  const params = [];
  const placeholders = rows.map((row, rowIndex) => {
    const offset = rowIndex * columns.length;
    params.push(...row);
    return `(${columns.map((_, colIndex) => `$${offset + colIndex + 1}`).join(', ')})`;
  });
  const updates = columns
    .filter((column) => column !== 'ruian_address_id')
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ');

  await pool.query(`
    INSERT INTO ruian_address_points (${columns.join(', ')})
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (ruian_address_id) DO UPDATE SET
      ${updates},
      imported_at = now()
  `, params);
}

async function main() {
  const sourceUrl = option('source-url', process.env.RUIAN_ADDRESS_SOURCE_URL || DEFAULT_SOURCE_URL);
  const zipPath = option('zip', process.env.RUIAN_ADDRESS_ZIP || DEFAULT_ZIP_PATH);
  const limit = Number(option('limit', '0')) || 0;
  const skip = Number(option('skip', '0')) || 0;
  const batchSize = Number(option('batch-size', process.env.RUIAN_ADDRESS_IMPORT_BATCH_SIZE || '1000'));
  const sourceFile = sourceUrl.split('/').pop() || 'ruian-addresses.xml.zip';

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  if (!fs.existsSync(zipPath) || flag('download')) {
    await download(sourceUrl, zipPath);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const unzip = spawn('unzip', ['-p', zipPath], { stdio: ['ignore', 'pipe', 'inherit'] });
  let buffer = '';
  let batch = [];
  let imported = 0;
  let parsed = 0;

  for await (const chunk of unzip.stdout) {
    buffer += chunk.toString('utf8');
    let end = buffer.indexOf('</vfa:Adresa>');
    while (end !== -1) {
      const start = buffer.lastIndexOf('<vfa:Adresa>', end);
      if (start === -1) {
        buffer = buffer.slice(end + '</vfa:Adresa>'.length);
        end = buffer.indexOf('</vfa:Adresa>');
        continue;
      }
      const block = buffer.slice(start, end + '</vfa:Adresa>'.length);
      buffer = buffer.slice(end + '</vfa:Adresa>'.length);
      const row = parseAddress(block, sourceFile);
      if (row) {
        parsed += 1;
        if (parsed > skip) {
          batch.push(row);
        }
      }
      if (batch.length >= batchSize) {
        await insertBatch(pool, batch);
        imported += batch.length;
        console.log(`Imported ${skip + imported}`);
        batch = [];
      }
      if (limit && imported + batch.length >= limit) {
        unzip.kill('SIGTERM');
        break;
      }
      end = buffer.indexOf('</vfa:Adresa>');
    }
    if (limit && imported + batch.length >= limit) break;
  }

  if (limit && batch.length > Math.max(0, limit - imported)) {
    batch = batch.slice(0, limit - imported);
  }
  await insertBatch(pool, batch);
  imported += batch.length;
  await pool.end();

  const exitCode = unzip.exitCode;
  if (!limit && exitCode && exitCode !== 0) {
    throw new Error(`unzip exited with ${exitCode}`);
  }

  console.log(`Done. Imported ${imported} RUIAN address rows after skipping ${skip}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
