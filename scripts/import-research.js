require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { requireEnv, DRY_RUN } = require('./lib/env');
const { createSupabaseClient } = require('./lib/supabase');
const { photoUrl, placesRequest } = require('./lib/googlePlaces');
const { sleep } = require('./lib/utils');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY } = requireEnv([
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_API_KEY',
]);

const KEEP_EXISTING = process.argv.includes('--keep-existing');
const REVERT = process.argv.includes('--revert');

// Parse --percentile flag (must match the value used during scoring)
function getPercentile() {
  const idx = process.argv.indexOf('--percentile');
  if (idx !== -1 && process.argv[idx + 1]) {
    const val = parseInt(process.argv[idx + 1], 10);
    if (val > 0 && val <= 100) return val;
  }
  return null; // Will read from metadata
}

const PLACE_CATEGORIES = new Set(['religious', 'nature', 'heritage']);
const BUSINESS_CATEGORIES = new Set(['restaurant', 'hotel', 'cafe', 'shop']);

const REQUIRED_COLUMNS_SQL = `
-- Run these in Supabase SQL editor before importing:
ALTER TABLE places ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE places ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE places ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE;
`.trim();

function mapPriceRange(priceLevel) {
  if (priceLevel == null) return null;
  if (priceLevel <= 2) return '$';
  if (priceLevel === 3) return '$$';
  return '$$$';
}

function getDescription(place) {
  if (place.editorial_summary) return place.editorial_summary.slice(0, 200);
  if (place.reviews && place.reviews.length > 0) {
    return place.reviews[0].text?.slice(0, 200) || null;
  }
  return null;
}

function getImageUrl(place) {
  if (place.photos && place.photos.length > 0 && place.photos[0].photo_reference) {
    return photoUrl(place.photos[0].photo_reference, GOOGLE_API_KEY, 800);
  }
  return null;
}

function formatOpenHours(openingHours) {
  if (!openingHours || !openingHours.weekday_text) return null;
  return openingHours.weekday_text.join('; ');
}

// Check that active/source columns exist by attempting a filtered query
async function checkColumns(supabase) {
  const { error: pErr } = await supabase.from('places').select('active,source').limit(1);
  if (pErr) return false;
  const { error: bErr } = await supabase.from('businesses').select('active,source').limit(1);
  if (bErr) return false;
  return true;
}

async function handleRevert(supabase) {
  console.log('=== Reverting to manual data ===\n');

  if (DRY_RUN) {
    console.log('DRY RUN — would execute:');
    console.log("  UPDATE places SET active = true WHERE source = 'manual'");
    console.log("  UPDATE businesses SET active = true WHERE source = 'manual'");
    console.log("  UPDATE places SET active = false WHERE source != 'manual'");
    console.log("  UPDATE businesses SET active = false WHERE source != 'manual'");
    return;
  }

  // Activate manual rows
  const { data: p1 } = await supabase.from('places').update({ active: true }).eq('source', 'manual').select('id');
  const { data: b1 } = await supabase.from('businesses').update({ active: true }).eq('source', 'manual').select('id');

  // Deactivate research and curated rows
  const { data: p2 } = await supabase.from('places').update({ active: false }).neq('source', 'manual').select('id');
  const { data: b2 } = await supabase.from('businesses').update({ active: false }).neq('source', 'manual').select('id');

  console.log(`Activated ${(p1 || []).length} manual places, ${(b1 || []).length} manual businesses.`);
  console.log(`Deactivated ${(p2 || []).length} research/curated places, ${(b2 || []).length} research/curated businesses.`);
  console.log('\nRevert complete! Manual data is now active.');
}

// Look up a manual place via Google Places Find Place API to get exact coords and photo
async function lookupManualPlace(entry) {
  const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(entry.search_name)}&inputtype=textquery&fields=place_id,name,geometry,photos,formatted_address,rating,user_ratings_total,formatted_phone_number,website,opening_hours,editorial_summary,types&key=${GOOGLE_API_KEY}`;
  const res = await placesRequest(findUrl);
  if (!res.ok || !res.data.candidates || res.data.candidates.length === 0) return null;
  return res.data.candidates[0];
}

// Load manual places from data/manual-places.json and enrich via Google API
async function loadManualPlaces(existingPlaceIds) {
  const manualPath = path.join(__dirname, '..', 'data', 'manual-places.json');
  if (!fs.existsSync(manualPath)) {
    console.log('No manual-places.json found, skipping manual additions.');
    return [];
  }

  const manual = JSON.parse(fs.readFileSync(manualPath, 'utf-8'));
  const entries = manual.places || [];
  console.log(`\nLoading ${entries.length} manual curated places...`);

  const results = [];
  for (const entry of entries) {
    // Skip if already in research data (by name match)
    const nameNorm = entry.name.toLowerCase();
    if (existingPlaceIds.has(nameNorm)) {
      console.log(`  Skipping "${entry.name}" — already in research data`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  Would look up: "${entry.search_name}"`);
      results.push({
        ...entry,
        place_id: `manual_${entry.name.replace(/\s+/g, '_').toLowerCase()}`,
        rating: null,
        user_ratings_total: 0,
        photos: null,
        editorial_summary: null,
        opening_hours: null,
        formatted_phone_number: null,
        website: null,
        price_level: null,
      });
      continue;
    }

    console.log(`  Looking up: "${entry.search_name}"`);
    const found = await lookupManualPlace(entry);
    await sleep(100);

    if (found) {
      const loc = found.geometry?.location;
      results.push({
        name: entry.name, // Keep our curated name
        category: entry.category,
        village: entry.village,
        lat: loc ? loc.lat : entry.lat,
        lng: loc ? loc.lng : entry.lng,
        place_id: found.place_id,
        rating: found.rating || null,
        user_ratings_total: found.user_ratings_total || 0,
        photos: found.photos || null,
        editorial_summary: found.editorial_summary?.overview || null,
        opening_hours: found.opening_hours || null,
        formatted_phone_number: found.formatted_phone_number || null,
        website: found.website || null,
        price_level: found.price_level || null,
        formatted_address: found.formatted_address || null,
      });
      console.log(`    ✓ Found on Google (${found.name})`);
    } else {
      // Use manual coordinates, no photo
      results.push({
        name: entry.name,
        category: entry.category,
        village: entry.village,
        lat: entry.lat,
        lng: entry.lng,
        place_id: `manual_${entry.name.replace(/\s+/g, '_').toLowerCase()}`,
        rating: null,
        user_ratings_total: 0,
        photos: null,
        editorial_summary: null,
        opening_hours: null,
        formatted_phone_number: null,
        website: null,
        price_level: null,
      });
      console.log(`    ✗ Not found — using manual coordinates`);
    }
  }

  console.log(`  → ${results.length} manual places to merge`);
  return results;
}

async function main() {
  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Check required columns exist
  const hasColumns = await checkColumns(supabase);
  if (!hasColumns) {
    console.error('Required columns (active, source) not found on places/businesses tables.');
    console.error('Run the following SQL in your Supabase SQL editor:\n');
    console.error(REQUIRED_COLUMNS_SQL);
    process.exit(1);
  }

  // Handle --revert mode
  if (REVERT) {
    await handleRevert(supabase);
    return;
  }

  const scoredPath = path.join(__dirname, '..', 'data', 'scored-places.json');

  if (!fs.existsSync(scoredPath)) {
    console.error(`File not found: ${scoredPath}`);
    console.error('Run "npm run score" first to generate scored data.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(scoredPath, 'utf-8'));
  const percentile = getPercentile() || data.metadata.percentile || 10;
  const places = data.places;

  // Get top percentile
  const topCount = Math.max(1, Math.ceil(places.length * percentile / 100));
  const topPlaces = places.slice(0, topCount); // Already sorted by score desc

  // Build a set of existing place names for dedup against manual places
  const existingNames = new Set(topPlaces.map(p => p.name.toLowerCase()));

  // Load and enrich manual curated places
  const manualPlaces = await loadManualPlaces(existingNames);

  // Find #1 per category for featured flag (from research data only)
  const topByCategory = {};
  for (const p of topPlaces) {
    if (!topByCategory[p.category]) topByCategory[p.category] = p;
  }

  // Split into places vs businesses
  const placeRows = [];
  const businessRows = [];

  // Add research data
  for (const p of topPlaces) {
    const isFeatured = topByCategory[p.category]?.place_id === p.place_id;
    const description = getDescription(p);
    const imageUrl = getImageUrl(p);
    const village = p.village || 'Unknown';

    if (PLACE_CATEGORIES.has(p.category)) {
      placeRows.push({
        name: p.name,
        name_ar: null,
        description: description,
        description_ar: null,
        category: p.category,
        village,
        latitude: p.lat,
        longitude: p.lng,
        image_url: imageUrl,
        featured: isFeatured,
        open_hours: formatOpenHours(p.opening_hours),
        google_place_id: p.place_id,
        active: true,
        source: 'google_research',
      });
    } else if (BUSINESS_CATEGORIES.has(p.category)) {
      businessRows.push({
        name: p.name,
        name_ar: null,
        description: description,
        description_ar: null,
        category: p.category,
        village,
        latitude: p.lat,
        longitude: p.lng,
        image_url: imageUrl,
        rating: p.rating,
        phone: p.formatted_phone_number || null,
        website: p.website || null,
        price_range: mapPriceRange(p.price_level),
        google_place_id: p.place_id,
        active: true,
        source: 'google_research',
      });
    }
  }

  // Add manual curated places
  let manualPlaceCount = 0;
  let manualBizCount = 0;
  for (const p of manualPlaces) {
    const imageUrl = getImageUrl(p);
    const village = p.village || 'Unknown';

    if (PLACE_CATEGORIES.has(p.category)) {
      placeRows.push({
        name: p.name,
        name_ar: null,
        description: p.editorial_summary ? p.editorial_summary.slice(0, 200) : null,
        description_ar: null,
        category: p.category,
        village,
        latitude: p.lat,
        longitude: p.lng,
        image_url: imageUrl,
        featured: false,
        open_hours: formatOpenHours(p.opening_hours),
        google_place_id: p.place_id,
        active: true,
        source: 'manual_curated',
      });
      manualPlaceCount++;
    } else if (BUSINESS_CATEGORIES.has(p.category)) {
      businessRows.push({
        name: p.name,
        name_ar: null,
        description: p.editorial_summary ? p.editorial_summary.slice(0, 200) : null,
        description_ar: null,
        category: p.category,
        village,
        latitude: p.lat,
        longitude: p.lng,
        image_url: imageUrl,
        rating: p.rating || null,
        phone: p.formatted_phone_number || null,
        website: p.website || null,
        price_range: mapPriceRange(p.price_level),
        google_place_id: p.place_id,
        active: true,
        source: 'manual_curated',
      });
      manualBizCount++;
    }
  }

  // Category breakdowns
  const placeCats = {};
  for (const r of placeRows) placeCats[r.category] = (placeCats[r.category] || 0) + 1;
  const bizCats = {};
  for (const r of businessRows) bizCats[r.category] = (bizCats[r.category] || 0) + 1;

  console.log('\n=== Import Summary ===');
  console.log(`Research: top ${percentile}% → ${topPlaces.length} places`);
  console.log(`Manual curated: ${manualPlaces.length} places (${manualPlaceCount} places table, ${manualBizCount} businesses table)`);
  console.log(`\nPlaces table: ${placeRows.length} rows`);
  for (const [cat, count] of Object.entries(placeCats)) console.log(`  ${cat}: ${count}`);
  console.log(`\nBusinesses table: ${businessRows.length} rows`);
  for (const [cat, count] of Object.entries(bizCats)) console.log(`  ${cat}: ${count}`);

  if (DRY_RUN) {
    console.log('\nDRY RUN — no database changes made.');
    console.log(`\nWould ${KEEP_EXISTING ? 'upsert (keeping existing active)' : 'deactivate existing and upsert'}:`);
    console.log(`  ${placeRows.length} places (${manualPlaceCount} manual)`);
    console.log(`  ${businessRows.length} businesses (${manualBizCount} manual)`);

    if (placeRows.length > 0) {
      console.log('\nSample place row:');
      console.log(JSON.stringify(placeRows[0], null, 2));
    }
    if (businessRows.length > 0) {
      console.log('\nSample business row:');
      console.log(JSON.stringify(businessRows[0], null, 2));
    }
    return;
  }

  // Step a/b: Tag existing rows with source = 'manual' where null
  await supabase.from('places').update({ source: 'manual' }).is('source', null);
  await supabase.from('businesses').update({ source: 'manual' }).is('source', null);
  console.log('\nTagged existing rows with source = "manual".');

  // Step c: Deactivate all existing rows (unless --keep-existing)
  let deactivatedPlaces = 0;
  let deactivatedBiz = 0;
  if (!KEEP_EXISTING) {
    const { data: dp } = await supabase.from('places').update({ active: false }).eq('active', true).select('id');
    const { data: db } = await supabase.from('businesses').update({ active: false }).eq('active', true).select('id');
    deactivatedPlaces = (dp || []).length;
    deactivatedBiz = (db || []).length;
    console.log(`Deactivated ${deactivatedPlaces} places, ${deactivatedBiz} businesses.`);
  }

  // Step d: Upsert new research + manual curated data
  let insertedPlaces = 0;
  let insertedBiz = 0;

  if (placeRows.length > 0) {
    for (let i = 0; i < placeRows.length; i += 50) {
      const batch = placeRows.slice(i, i + 50);
      const { error } = await supabase.from('places').upsert(batch, { onConflict: 'google_place_id' });
      if (error) { console.error(`Failed to upsert places batch ${i}:`, error.message); process.exit(1); }
    }
    insertedPlaces = placeRows.length;
    console.log(`Upserted ${insertedPlaces} places (${manualPlaceCount} manual curated).`);
  }

  if (businessRows.length > 0) {
    for (let i = 0; i < businessRows.length; i += 50) {
      const batch = businessRows.slice(i, i + 50);
      const { error } = await supabase.from('businesses').upsert(batch, { onConflict: 'google_place_id' });
      if (error) { console.error(`Failed to upsert businesses batch ${i}:`, error.message); process.exit(1); }
    }
    insertedBiz = businessRows.length;
    console.log(`Upserted ${insertedBiz} businesses (${manualBizCount} manual curated).`);
  }

  // Step e: Summary
  console.log('\n=== Final Summary ===');
  console.log(`Existing rows deactivated: ${deactivatedPlaces} places, ${deactivatedBiz} businesses`);
  console.log(`Research rows upserted: ${insertedPlaces - manualPlaceCount} places, ${insertedBiz - manualBizCount} businesses`);
  console.log(`Manual curated upserted: ${manualPlaceCount} places, ${manualBizCount} businesses`);
  console.log(`Total active: ${insertedPlaces} places, ${insertedBiz} businesses`);
  console.log('\nImport complete! Use --revert to restore manual data.');
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
