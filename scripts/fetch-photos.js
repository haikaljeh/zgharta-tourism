#!/usr/bin/env node
// =============================================
// PHOTO FETCHER - Google Places API → Supabase
// =============================================
// This script:
// 1. Reads all places & businesses from Supabase
// 2. Searches Google Places API for each one
// 3. Gets the best photo URL
// 4. Updates the image_url in Supabase
//
// USAGE:
//   node scripts/fetch-photos.js
//   node scripts/fetch-photos.js --dry-run
//
// REQUIRES:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY env vars
// =============================================

const { requireEnv, DRY_RUN } = require('./lib/env');
const { createSupabaseClient } = require('./lib/supabase');
const { findPlace, getDetails, photoUrl } = require('./lib/googlePlaces');
const { sleep, FailureTracker } = require('./lib/utils');

const env = requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_API_KEY']);
const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DELAY_MS = 500;

async function processTable(tableName, items, failures) {
  console.log(`\nProcessing ${tableName} (${items.length} items)...`);
  console.log('-'.repeat(50));

  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    if (item.image_url) {
      console.log(`  Skip: ${item.name} — already has image`);
      skipped++;
      continue;
    }

    console.log(`  Search: ${item.name} (${item.village})...`);
    await sleep(DELAY_MS);

    const query = `${item.name} ${item.village} Lebanon`;
    const searchRes = await findPlace(query, env.GOOGLE_API_KEY);
    if (!searchRes.ok) {
      console.log(`  No results for "${item.name}"${searchRes.message ? `: ${searchRes.message}` : ''}`);
      failures.add(searchRes.errorType || 'NO_RESULTS', item.name);
      continue;
    }

    // Get photo reference
    let photoRef = null;
    if (searchRes.candidate.photos?.length > 0) {
      photoRef = searchRes.candidate.photos[0].photo_reference;
    } else {
      await sleep(DELAY_MS);
      const detailsRes = await getDetails(searchRes.candidate.place_id, env.GOOGLE_API_KEY);
      if (detailsRes.ok && detailsRes.result?.photos?.length > 0) {
        photoRef = detailsRes.result.photos[0].photo_reference;
      }
    }

    if (!photoRef) {
      console.log(`  No photos found for "${item.name}"`);
      failures.add('NO_PHOTOS', item.name);
      continue;
    }

    const imageUrl = photoUrl(photoRef, env.GOOGLE_API_KEY, 800);

    if (DRY_RUN) {
      console.log(`  Would update: ${item.name} — photo URL ready`);
      updated++;
      continue;
    }

    const { error } = await supabase
      .from(tableName)
      .update({ image_url: imageUrl })
      .eq('id', item.id);

    if (error) {
      console.log(`  DB update failed for "${item.name}": ${error.message}`);
      failures.add('DB_UPDATE_FAILED', item.name);
    } else {
      console.log(`  Updated: ${item.name} — photo saved!`);
      updated++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n  ${tableName} results: ${updated} updated, ${skipped} skipped, ${failures.count} failed`);
  return { updated, skipped };
}

async function main() {
  console.log('Zgharta Tourism App — Photo Fetcher');
  console.log('=========================================');
  if (DRY_RUN) console.log('** DRY RUN — no database writes **');
  console.log('');

  const { data: places, error: pErr } = await supabase.from('places').select('*');
  if (pErr) { console.error('Failed to fetch places:', pErr.message); process.exit(1); }

  const { data: businesses, error: bErr } = await supabase.from('businesses').select('*');
  if (bErr) { console.error('Failed to fetch businesses:', bErr.message); process.exit(1); }

  console.log(`Found ${places.length} places and ${businesses.length} businesses\n`);

  const failures = new FailureTracker();
  const placesResult = await processTable('places', places, failures);
  const bizResult = await processTable('businesses', businesses, failures);

  const total = placesResult.updated + bizResult.updated;
  const totalSkipped = placesResult.skipped + bizResult.skipped;
  console.log('\n=========================================');
  console.log(`Done! updated: ${total}, skipped: ${totalSkipped}, failed: ${failures.count}`);
  console.log('=========================================');

  failures.print();

  if (failures.count > 0) {
    console.log('\nTip: For failed items, you can manually add image URLs');
    console.log('   in the Supabase Table Editor -> image_url column');
  }

  console.log('\nNote: Google Places photo URLs expire after a few months.');
  console.log('   For production, consider downloading images to Supabase Storage.');
  console.log('   Run this script periodically to refresh URLs.\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
