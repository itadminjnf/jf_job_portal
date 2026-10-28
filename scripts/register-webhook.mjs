/**
 * OTYS Webhook & Vacancy URL Format Registration Script
 *
 * Usage:
 *   node scripts/register-webhook.mjs [SITE_URL]
 *
 * Example:
 *   node scripts/register-webhook.mjs https://jacksonfrank.com
 *   node scripts/register-webhook.mjs https://your-ngrok-tunnel.ngrok-free.app
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env.local or .env
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  const env = {};
  for (const file of envFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/(^["']|["']$)/g, '');
          if (!env[key]) env[key] = val;
        }
      }
    }
  }
  return env;
}

const env = loadEnv();

const baseUrl = (process.env.OTYS_API_BASE_URL || env.OTYS_API_BASE_URL || 'https://webapi.otys.app/api').replace(/\/+$/, '');
const apiKey = process.env.OTYS_API_KEY || env.OTYS_API_KEY;
const websiteId = process.env.OTYS_WEBSITE_ID || env.OTYS_WEBSITE_ID || '2';

let siteUrl = process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_SITE_URL;

if (!siteUrl) {
  console.log('⚠️  No SITE_URL provided as argument or in .env (NEXT_PUBLIC_SITE_URL).');
  console.log('👉 Defaulting to: http://localhost:3000');
  console.log('💡 For production, run: node scripts/register-webhook.mjs https://your-domain.com\n');
  siteUrl = 'http://localhost:3000';
}

siteUrl = siteUrl.replace(/\/+$/, '');

const webhookEndpoint = `${siteUrl}/api/webhooks/otys`;

console.log('=====================================================');
console.log('🚀 OTYS Webhook & URL Slug Registration');
console.log('=====================================================');
console.log(`📡 OTYS Base API : ${baseUrl}`);
console.log(`🌐 Website ID    : ${websiteId}`);
console.log(`🔗 Website URL   : ${siteUrl}`);
console.log(`🎯 Webhook Target: ${webhookEndpoint}`);
console.log(`🏷️  Detail Format : /vacancies/{{slug}}`);
console.log('=====================================================\n');

if (!apiKey) {
  console.error('❌ ERROR: OTYS_API_KEY is not defined in .env.local or environment.');
  process.exit(1);
}

async function run() {
  try {
    // Step 1: Obtain Access Token
    console.log('1️⃣ Authenticating with OTYS API...');
    const authRes = await fetch(`${baseUrl}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Website-ID': String(websiteId),
      },
      body: JSON.stringify({ key: apiKey }),
    });

    if (!authRes.ok) {
      const errText = await authRes.text();
      throw new Error(`Authentication failed [${authRes.status}]: ${errText}`);
    }

    const authData = await authRes.json();
    const token = authData.accessToken || authData.token || authData.access_token;
    if (!token) {
      throw new Error('Received authentication response without access token.');
    }
    console.log('✅ Authentication successful!\n');

    // Step 2: Fetch Current Website Configuration
    console.log(`2️⃣ Inspecting current Website configuration (ID: ${websiteId})...`);
    const getRes = await fetch(`${baseUrl}/websites/${websiteId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Website-ID': String(websiteId),
        Accept: 'application/ld+json, application/json',
      },
    });

    if (getRes.ok) {
      const currentConfig = await getRes.json();
      console.log('Current OTYS Website Configuration:');
      console.log(` - Current webhookUrl                     : ${currentConfig.webhookUrl || '(NOT SET)'}`);
      console.log(` - Current externalVacancyDetailUrlFormat : ${currentConfig.externalVacancyDetailUrlFormat || '(NOT SET)'}`);
      console.log(` - Current externalApplyUrlFormat         : ${currentConfig.externalApplyUrlFormat || '(NOT SET)'}`);
      console.log(` - Current externalUrl                    : ${currentConfig.externalUrl || '(NOT SET)'}\n`);
    } else {
      console.warn(`⚠️ Could not inspect current config (${getRes.status}). Proceeding with PATCH...`);
    }

    // Step 3: Patch Website Entity
    console.log('3️⃣ Updating OTYS Website entity with webhook URL & slug format...');
    const patchPayload = {
      webhookUrl: webhookEndpoint,
      externalVacancyDetailUrlFormat: '/vacancies/{{slug}}',
      externalApplyUrlFormat: '/vacancies/{{slug}}#apply',
      externalUrl: siteUrl,
    };

    let patchRes = await fetch(`${baseUrl}/websites/${websiteId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Website-ID': String(websiteId),
        'Content-Type': 'application/merge-patch+json',
        Accept: 'application/ld+json, application/json',
      },
      body: JSON.stringify(patchPayload),
    });

    if (!patchRes.ok) {
      console.log('⚠️ merge-patch+json failed, retrying with application/json...');
      patchRes = await fetch(`${baseUrl}/websites/${websiteId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Website-ID': String(websiteId),
          'Content-Type': 'application/json',
          Accept: 'application/ld+json, application/json',
        },
        body: JSON.stringify(patchPayload),
      });
    }

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      throw new Error(`PATCH /websites/${websiteId} failed [${patchRes.status}]: ${errText}`);
    }

    const updatedData = await patchRes.json();
    console.log('🎉 SUCCESS! OTYS Website configuration successfully updated.');
    console.log('Updated configuration:');
    console.log(JSON.stringify(updatedData, null, 2));
    console.log('\n✅ OTYS will now send webhook signals to your site whenever vacancies change!');
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}

run();

