#!/usr/bin/env node
// =============================================
// BULK BUSINESS IMPORTER
// Google Places API → Supabase
// =============================================
// Searches for real restaurants, hotels, cafes,
// shops, and BnBs in the Zgharta/Ehden area
// and imports them with full details.
//
// USAGE:
//   node scripts/import-businesses.js
//   node scripts/import-businesses.js --dry-run
//
// REQUIRES:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY env vars
// =============================================
// SQL needed for upsert (run once in Supabase SQL editor):
//   ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE;
// =============================================

const { requireEnv, DRY_RUN } = require('./lib/env');
const { createSupabaseClient } = require('./lib/supabase');
const { nearbySearch, getDetails, photoUrl } = require('./lib/googlePlaces');
const { sleep, FailureTracker } = require('./lib/utils');

const env = requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_API_KEY']);
const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DELAY_MS = 300;

// Areas to search — centers of each village
const SEARCH_AREAS = [
  { name: 'Ehden', lat: 34.3050, lng: 35.9870, radius: 3000 },
  { name: 'Zgharta', lat: 34.3998, lng: 35.8923, radius: 3000 },
  { name: 'Ardeh', lat: 34.4131, lng: 35.9119, radius: 2000 },
  { name: 'Kfarsghab', lat: 34.3178, lng: 35.9956, radius: 2000 },
  { name: 'Aito', lat: 34.2900, lng: 35.9500, radius: 2000 },
  { name: 'Bqaa Safrin', lat: 34.3500, lng: 35.9600, radius: 2000 },
  { name: 'Rachiine', lat: 34.3900, lng: 35.8800, radius: 2000 },
  { name: 'Kfardlakos', lat: 34.3850, lng: 35.8950, radius: 2000 },
  { name: 'Kfarhata', lat: 34.3750, lng: 35.8850, radius: 2000 },
  { name: 'Mejdlaya', lat: 34.4050, lng: 35.9050, radius: 2000 },
  { name: 'Bsharri', lat: 34.2512, lng: 36.0120, radius: 2000 },
  { name: 'Asnoun', lat: 34.3880, lng: 35.8780, radius: 1500 },
  { name: 'Harf Ardeh', lat: 34.3988, lng: 35.9130, radius: 1500 },
  { name: 'Miryata', lat: 34.3400, lng: 35.9200, radius: 2000 },
];

// What to search for
const SEARCH_QUERIES = [
  { query: 'restaurant', category: 'restaurant' },
  { query: 'hotel', category: 'hotel' },
  { query: 'cafe', category: 'cafe' },
  { query: 'shop', category: 'shop' },
  { query: 'bed and breakfast', category: 'hotel' },
  { query: 'guesthouse', category: 'hotel' },
  { query: 'lodge', category: 'hotel' },
  { query: 'bakery', category: 'cafe' },
  { query: 'bar', category: 'cafe' },
  { query: 'supermarket', category: 'shop' },
  { query: 'souvenir', category: 'shop' },
];

// Map Google price_level to our price_range
function mapPriceLevel(level) {
  if (level === 0 || level === 1) return '$';
  if (level === 2) return '$$';
  if (level === 3) return '$$$';
  if (level === 4) return '$$$$';
  return '$$';
}

// Guess which village a place belongs to based on coordinates
function guessVillage(lat, lng) {
  let closest = 'Ehden';
  let minDist = Infinity;
  for (const area of SEARCH_AREAS) {
    const d = Math.sqrt(Math.pow(lat - area.lat, 2) + Math.pow(lng - area.lng, 2));
    if (d < minDist) { minDist = d; closest = area.name; }
  }
  return closest;
}

async function main() {
  console.log('Zgharta Tourism — Bulk Business Importer');
  console.log('==============================================');
  if (DRY_RUN) console.log('** DRY RUN — no database writes **');
  console.log('');

  const seenPlaceIds = new Set();
  const allBusinesses = [];
  const failures = new FailureTracker();

  for (const area of SEARCH_AREAS) {
    for (const sq of SEARCH_QUERIES) {
      console.log(`Searching "${sq.query}" in ${area.name}...`);
      await sleep(DELAY_MS);

      const searchRes = await nearbySearch(area.lat, area.lng, area.radius, sq.query, env.GOOGLE_API_KEY);
      if (!searchRes.ok) {
        console.log(`   Search failed${searchRes.message ? `: ${searchRes.message}` : ''}`);
        failures.add(searchRes.errorType || 'SEARCH_FAILED', `${sq.query} in ${area.name}`);
        continue;
      }
      console.log(`   Found ${searchRes.results.length} results`);

      for (const place of searchRes.results) {
        if (seenPlaceIds.has(place.place_id)) continue;
        seenPlaceIds.add(place.place_id);

        await sleep(DELAY_MS);
        const detailFields = 'name,formatted_phone_number,international_phone_number,website,rating,price_level,photos,geometry,types,editorial_summary,opening_hours';
        const detailsRes = await getDetails(place.place_id, env.GOOGLE_API_KEY, detailFields);
        if (!detailsRes.ok || !detailsRes.result) {
          failures.add(detailsRes.errorType || 'DETAILS_FAILED', place.name);
          continue;
        }

        const details = detailsRes.result;
        const lat = details.geometry?.location?.lat || place.geometry?.location?.lat;
        const lng = details.geometry?.location?.lng || place.geometry?.location?.lng;
        const village = guessVillage(lat, lng);

        let imageUrl = null;
        if (details.photos?.length > 0) {
          imageUrl = photoUrl(details.photos[0].photo_reference, env.GOOGLE_API_KEY);
        }

        const phone = details.international_phone_number || details.formatted_phone_number || null;
        const description = details.editorial_summary?.overview || null;

        allBusinesses.push({
          name: place.name,
          name_ar: null,
          category: sq.category,
          village,
          description,
          description_ar: null,
          image_url: imageUrl,
          latitude: lat,
          longitude: lng,
          rating: details.rating || place.rating || null,
          price_range: mapPriceLevel(details.price_level),
          phone,
          website: details.website || null,
          specialties: null,
          verified: true,
          google_place_id: place.place_id,
        });
        console.log(`   + ${place.name} (${sq.category}) — ${village}`);
      }
    }
  }

  console.log(`\nTotal unique businesses found: ${allBusinesses.length}\n`);

  if (allBusinesses.length === 0) {
    console.log('No businesses found. Check your API key and that Places API is enabled.');
    failures.print();
    process.exit(0);
  }

  const counts = {};
  allBusinesses.forEach(b => { counts[b.category] = (counts[b.category] || 0) + 1; });
  console.log('Category breakdown:');
  Object.entries(counts).forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));
  console.log('');

  if (DRY_RUN) {
    console.log('==============================================');
    console.log(`DRY RUN complete. ${allBusinesses.length} businesses would be upserted.`);
    console.log('==============================================');
    failures.print();
    return;
  }

  const batchSize = 20;
  let inserted = 0;

  for (let i = 0; i < allBusinesses.length; i += batchSize) {
    const batch = allBusinesses.slice(i, i + batchSize);
    const { error } = await supabase
      .from('businesses')
      .upsert(batch, { onConflict: 'google_place_id' });
    if (error) {
      console.error(`Batch upsert failed: ${error.message}`);
      for (const biz of batch) {
        const { error: singleErr } = await supabase
          .from('businesses')
          .upsert(biz, { onConflict: 'google_place_id' });
        if (singleErr) {
          console.error(`   Skipped "${biz.name}": ${singleErr.message}`);
          failures.add('DB_UPSERT_FAILED', biz.name);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
      console.log(`   Upserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)`);
    }
  }

  console.log('\n==============================================');
  console.log(`Done! upserted: ${inserted}, failed: ${failures.count}`);
  console.log('==============================================');

  failures.print();

  console.log('\nTips:');
  console.log('   - Arabic names (name_ar) are blank — add manually or use a translation API');
  console.log('   - Photo URLs expire after a few months — re-run periodically');
  console.log('   - Check Supabase Table Editor to review imported data');
  console.log('   - You can edit descriptions, specialties, etc. in the Table Editor\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
