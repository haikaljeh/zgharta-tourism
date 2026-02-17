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

const DELAY_MS = 300;
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

// Google Places API URLs
const NEARBY_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const PLACE_PHOTO_URL = 'https://maps.googleapis.com/maps/api/place/photo';

// Map Google price_level to our price_range
function mapPriceLevel(level) {
  if (level === 0 || level === 1) return '$';
  if (level === 2) return '$$';
  if (level === 3) return '$$$';
  if (level === 4) return '$$$$';
  return '$$'; // default
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

async function searchNearby(lat, lng, radius, keyword) {
  const url = `${NEARBY_SEARCH_URL}?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${GOOGLE_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error(`  Search failed: ${err.message}`);
    return [];
  }
}

async function getPlaceDetails(placeId) {
  const fields = 'name,formatted_phone_number,international_phone_number,website,rating,price_level,photos,geometry,types,editorial_summary,opening_hours';
  const url = `${PLACE_DETAILS_URL}?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.result || null;
  } catch (err) {
    console.error(`  Details failed: ${err.message}`);
    return null;
  }
}

function getPhotoUrl(photoReference, maxWidth = 800) {
  return `${PLACE_PHOTO_URL}?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

async function main() {
  console.log('Zgharta Tourism — Bulk Business Importer');
  console.log('==============================================');
  if (DRY_RUN) console.log('** DRY RUN — no database writes **');
  console.log('');

  // Track unique places by Google place_id to avoid duplicates
  const seenPlaceIds = new Set();
  const allBusinesses = [];

  // Search each area x each query
  for (const area of SEARCH_AREAS) {
    for (const sq of SEARCH_QUERIES) {
      console.log(`Searching "${sq.query}" in ${area.name}...`);
      await sleep(DELAY_MS);

      const results = await searchNearby(area.lat, area.lng, area.radius, sq.query);
      console.log(`   Found ${results.length} results`);

      for (const place of results) {
        if (seenPlaceIds.has(place.place_id)) continue;
        seenPlaceIds.add(place.place_id);

        // Get full details
        await sleep(DELAY_MS);
        const details = await getPlaceDetails(place.place_id);
        if (!details) continue;

        const lat = details.geometry?.location?.lat || place.geometry?.location?.lat;
        const lng = details.geometry?.location?.lng || place.geometry?.location?.lng;
        const village = guessVillage(lat, lng);

        // Get photo URL
        let imageUrl = null;
        if (details.photos && details.photos.length > 0) {
          imageUrl = getPhotoUrl(details.photos[0].photo_reference);
        }

        // Get phone number
        const phone = details.international_phone_number || details.formatted_phone_number || null;

        // Get description
        const description = details.editorial_summary?.overview || null;

        const business = {
          name: place.name,
          name_ar: null,
          category: sq.category,
          village: village,
          description: description,
          description_ar: null,
          image_url: imageUrl,
          latitude: lat,
          longitude: lng,
          rating: details.rating || place.rating || null,
          price_range: mapPriceLevel(details.price_level),
          phone: phone,
          website: details.website || null,
          specialties: null,
          verified: true,
          google_place_id: place.place_id,
        };

        allBusinesses.push(business);
        console.log(`   + ${place.name} (${sq.category}) — ${village}`);
      }
    }
  }

  console.log(`\nTotal unique businesses found: ${allBusinesses.length}\n`);

  if (allBusinesses.length === 0) {
    console.log('No businesses found. Check your API key and that Places API is enabled.');
    process.exit(0);
  }

  // Show summary before importing
  const counts = {};
  allBusinesses.forEach(b => { counts[b.category] = (counts[b.category] || 0) + 1; });
  console.log('Category breakdown:');
  Object.entries(counts).forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));
  console.log('');

  if (DRY_RUN) {
    console.log('==============================================');
    console.log(`DRY RUN complete. ${allBusinesses.length} businesses would be upserted.`);
    console.log('==============================================');
    return;
  }

  // Upsert in batches of 20
  const batchSize = 20;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < allBusinesses.length; i += batchSize) {
    const batch = allBusinesses.slice(i, i + batchSize);
    const { error } = await supabase
      .from('businesses')
      .upsert(batch, { onConflict: 'google_place_id' });
    if (error) {
      console.error(`Batch upsert failed: ${error.message}`);
      // Try one by one
      for (const biz of batch) {
        const { error: singleErr } = await supabase
          .from('businesses')
          .upsert(biz, { onConflict: 'google_place_id' });
        if (singleErr) {
          console.error(`   Skipped "${biz.name}": ${singleErr.message}`);
          failed++;
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
  console.log(`Done! upserted: ${inserted}, failed: ${failed}`);
  console.log('==============================================');
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
