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

const { requireEnv, DRY_RUN } = require('./lib/env');
const { createSupabaseClient } = require('./lib/supabase');
const { findPlace, getDetails } = require('./lib/googlePlaces');
const { sleep, FailureTracker } = require('./lib/utils');

const env = requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_API_KEY']);
const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Website & Phone Updater');
  if (DRY_RUN) console.log('** DRY RUN — no database writes **');
  console.log('');

  const { data: businesses, error } = await supabase.from('businesses').select('*');
  if (error) { console.error('Failed to fetch:', error.message); process.exit(1); }

  console.log(`Found ${businesses.length} businesses\n`);

  let updatedCount = 0;
  let skipped = 0;
  const failures = new FailureTracker();

  for (const biz of businesses) {
    if (biz.website && biz.phone) {
      console.log(`  Skip: ${biz.name} — already has website & phone`);
      skipped++;
      continue;
    }

    console.log(`  Search: ${biz.name}...`);
    await sleep(300);

    const query = `${biz.name} ${biz.village} Lebanon`;
    const searchRes = await findPlace(query, env.GOOGLE_API_KEY, 'place_id');
    if (!searchRes.ok) {
      console.log(`     No results found${searchRes.message ? `: ${searchRes.message}` : ''}`);
      failures.add(searchRes.errorType || 'NO_RESULTS', biz.name);
      continue;
    }

    await sleep(200);
    const detailsRes = await getDetails(searchRes.candidate.place_id, env.GOOGLE_API_KEY, 'website,formatted_phone_number,international_phone_number');
    if (!detailsRes.ok || !detailsRes.result) {
      console.log(`     Details lookup failed${detailsRes.message ? `: ${detailsRes.message}` : ''}`);
      failures.add(detailsRes.errorType || 'DETAILS_FAILED', biz.name);
      continue;
    }

    const result = detailsRes.result;
    const updates = {};
    if (result.website && !biz.website) updates.website = result.website;
    const phone = result.international_phone_number || result.formatted_phone_number || null;
    if (phone && !biz.phone) updates.phone = phone;

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
      failures.add('DB_UPDATE_FAILED', biz.name);
    } else {
      updatedCount++;
      console.log(`     Updated: ${Object.keys(updates).join(', ')}`);
      if (updates.website) console.log(`        website: ${updates.website}`);
      if (updates.phone) console.log(`        phone: ${updates.phone}`);
    }
  }

  console.log(`\n==============================================`);
  console.log(`Done! updated: ${updatedCount}, skipped: ${skipped}, failed: ${failures.count}`);
  console.log(`==============================================`);

  failures.print();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
