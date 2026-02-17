#!/usr/bin/env node
// =============================================
// WEBSITE UPDATER
// Finds and adds website URLs for existing businesses
// =============================================
//
// USAGE:
//   node scripts/update-websites.js
//   node scripts/update-websites.js --dry-run
//
// REQUIRES:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY env vars
// =============================================

const { createClient } = require('@supabase/supabase-js');

// ---- ENV VALIDATION ----
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const missing = [];
if (!SUPABASE_URL) missing.push('SUPABASE_URL');
if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
if (!GOOGLE_API_KEY) missing.push('GOOGLE_API_KEY');
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in your values.');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function findWebsite(name, village) {
  const query = `${name} ${village} Lebanon`;
  const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(searchUrl);
    const data = await res.json();
    if (!data.candidates?.length) return null;

    await sleep(200);
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${data.candidates[0].place_id}&fields=website,formatted_phone_number,international_phone_number&key=${GOOGLE_API_KEY}`;
    const dRes = await fetch(detailsUrl);
    const dData = await dRes.json();
    return {
      website: dData.result?.website || null,
      phone: dData.result?.international_phone_number || dData.result?.formatted_phone_number || null
    };
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('Website & Phone Updater');
  if (DRY_RUN) console.log('** DRY RUN — no database writes **');
  console.log('');

  const { data: businesses, error } = await supabase.from('businesses').select('*');
  if (error) { console.error('Failed to fetch:', error.message); process.exit(1); }

  console.log(`Found ${businesses.length} businesses\n`);

  let updatedCount = 0;
  let skipped = 0;
  let failed = 0;

  for (const biz of businesses) {
    // Skip if already has both website and phone
    if (biz.website && biz.phone) {
      console.log(`  Skip: ${biz.name} — already has website & phone`);
      skipped++;
      continue;
    }

    console.log(`  Search: ${biz.name}...`);
    await sleep(300);

    const result = await findWebsite(biz.name, biz.village);
    if (!result) { console.log(`     No results found`); failed++; continue; }

    const updates = {};
    if (result.website && !biz.website) updates.website = result.website;
    if (result.phone && !biz.phone) updates.phone = result.phone;

    if (Object.keys(updates).length === 0) {
      console.log(`     No new data to add`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`     Would update: ${Object.keys(updates).join(', ')}`);
      if (updates.website) console.log(`        website: ${updates.website}`);
      if (updates.phone) console.log(`        phone: ${updates.phone}`);
      updatedCount++;
      continue;
    }

    const { error: upErr } = await supabase.from('businesses').update(updates).eq('id', biz.id);
    if (upErr) {
      console.log(`     Update failed: ${upErr.message}`);
      failed++;
    } else {
      updatedCount++;
      console.log(`     Updated: ${Object.keys(updates).join(', ')}`);
      if (updates.website) console.log(`        website: ${updates.website}`);
      if (updates.phone) console.log(`        phone: ${updates.phone}`);
    }
  }

  console.log(`\n==============================================`);
  console.log(`Done! updated: ${updatedCount}, skipped: ${skipped}, failed: ${failed}`);
  console.log(`==============================================`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
