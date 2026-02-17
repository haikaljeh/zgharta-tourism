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

// Google Places API base URLs
const PLACES_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';
const PLACES_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const PLACES_PHOTO_URL = 'https://maps.googleapis.com/maps/api/place/photo';

// Delay between API calls to avoid rate limits
const DELAY_MS = 500;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function searchPlace(name, village) {
  const query = `${name} ${village} Lebanon`;
  const url = `${PLACES_SEARCH_URL}?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,photos&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0];
    }
    return null;
  } catch (err) {
    console.error(`  Search failed for "${name}": ${err.message}`);
    return null;
  }
}

async function getPlaceDetails(placeId) {
  const url = `${PLACES_DETAILS_URL}?place_id=${placeId}&fields=photos&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.result?.photos && data.result.photos.length > 0) {
      return data.result.photos[0].photo_reference;
    }
    return null;
  } catch (err) {
    console.error(`  Details failed: ${err.message}`);
    return null;
  }
}

function getPhotoUrl(photoReference, maxWidth = 800) {
  return `${PLACES_PHOTO_URL}?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

async function processTable(tableName, items) {
  console.log(`\nProcessing ${tableName} (${items.length} items)...`);
  console.log('-'.repeat(50));

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    // Skip if already has an image
    if (item.image_url) {
      console.log(`  Skip: ${item.name} — already has image`);
      skipped++;
      continue;
    }

    console.log(`  Search: ${item.name} (${item.village})...`);
    await sleep(DELAY_MS);

    // Step 1: Search for the place
    const candidate = await searchPlace(item.name, item.village);
    if (!candidate) {
      console.log(`  No results for "${item.name}"`);
      failed++;
      continue;
    }

    // Step 2: Get photo reference
    let photoRef = null;
    if (candidate.photos && candidate.photos.length > 0) {
      photoRef = candidate.photos[0].photo_reference;
    } else {
      // Try getting details for photos
      await sleep(DELAY_MS);
      photoRef = await getPlaceDetails(candidate.place_id);
    }

    if (!photoRef) {
      console.log(`  No photos found for "${item.name}"`);
      failed++;
      continue;
    }

    // Step 3: Build photo URL
    const photoUrl = getPhotoUrl(photoRef, 800);

    if (DRY_RUN) {
      console.log(`  Would update: ${item.name} — photo URL ready`);
      updated++;
      continue;
    }

    // Step 4: Update Supabase
    const { error } = await supabase
      .from(tableName)
      .update({ image_url: photoUrl })
      .eq('id', item.id);

    if (error) {
      console.log(`  DB update failed for "${item.name}": ${error.message}`);
      failed++;
    } else {
      console.log(`  Updated: ${item.name} — photo saved!`);
      updated++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n  ${tableName} results: ${updated} updated, ${skipped} skipped, ${failed} failed`);
  return { updated, skipped, failed };
}

async function main() {
  console.log('Zgharta Tourism App — Photo Fetcher');
  console.log('=========================================');
  if (DRY_RUN) console.log('** DRY RUN — no database writes **');
  console.log('');

  // Fetch all places
  const { data: places, error: pErr } = await supabase.from('places').select('*');
  if (pErr) { console.error('Failed to fetch places:', pErr.message); process.exit(1); }

  // Fetch all businesses
  const { data: businesses, error: bErr } = await supabase.from('businesses').select('*');
  if (bErr) { console.error('Failed to fetch businesses:', bErr.message); process.exit(1); }

  console.log(`Found ${places.length} places and ${businesses.length} businesses\n`);

  // Process both tables
  const placesResult = await processTable('places', places);
  const bizResult = await processTable('businesses', businesses);

  // Summary
  const total = placesResult.updated + bizResult.updated;
  const totalSkipped = placesResult.skipped + bizResult.skipped;
  const totalFailed = placesResult.failed + bizResult.failed;
  console.log('\n=========================================');
  console.log(`Done! updated: ${total}, skipped: ${totalSkipped}, failed: ${totalFailed}`);
  console.log('=========================================');

  if (totalFailed > 0) {
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
