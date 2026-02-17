require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { requireEnv, DRY_RUN } = require('./lib/env');
const { createSupabaseClient } = require('./lib/supabase');
const { photoUrl } = require('./lib/googlePlaces');

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
    console.log("  UPDATE places SET active = false WHERE source = 'google_research'");
    console.log("  UPDATE businesses SET active = false WHERE source = 'google_research'");
    return;
  }

  // Activate manual rows
  const { data: p1 } = await supabase.from('places').update({ active: true }).eq('source', 'manual').select('id');
  const { data: b1 } = await supabase.from('businesses').update({ active: true }).eq('source', 'manual').select('id');

  // Deactivate research rows
  const { data: p2 } = await supabase.from('places').update({ active: false }).eq('source', 'google_research').select('id');
  const { data: b2 } = await supabase.from('businesses').update({ active: false }).eq('source', 'google_research').select('id');

  console.log(`Activated ${(p1 || []).length} manual places, ${(b1 || []).length} manual businesses.`);
  console.log(`Deactivated ${(p2 || []).length} research places, ${(b2 || []).length} research businesses.`);
  console.log('\nRevert complete! Manual data is now active.');
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

  // Find #1 per category for featured flag
  const topByCategory = {};
  for (const p of topPlaces) {
    if (!topByCategory[p.category]) topByCategory[p.category] = p;
  }

  // Split into places vs businesses
  const placeRows = [];
  const businessRows = [];

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

  // Category breakdowns
  const placeCats = {};
  for (const r of placeRows) placeCats[r.category] = (placeCats[r.category] || 0) + 1;
  const bizCats = {};
  for (const r of businessRows) bizCats[r.category] = (bizCats[r.category] || 0) + 1;

  console.log('=== Import Summary ===');
  console.log(`Percentile: top ${percentile}% → ${topPlaces.length} places total`);
  console.log(`\nPlaces table: ${placeRows.length} rows`);
  for (const [cat, count] of Object.entries(placeCats)) console.log(`  ${cat}: ${count}`);
  console.log(`\nBusinesses table: ${businessRows.length} rows`);
  for (const [cat, count] of Object.entries(bizCats)) console.log(`  ${cat}: ${count}`);

  if (DRY_RUN) {
    console.log('\nDRY RUN — no database changes made.');
    console.log(`\nWould ${KEEP_EXISTING ? 'upsert (keeping existing active)' : 'deactivate existing and upsert'}:`);
    console.log(`  ${placeRows.length} places`);
    console.log(`  ${businessRows.length} businesses`);

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

  // Step d: Upsert new research data
  let insertedPlaces = 0;
  let insertedBiz = 0;

  if (placeRows.length > 0) {
    for (let i = 0; i < placeRows.length; i += 50) {
      const batch = placeRows.slice(i, i + 50);
      const { error } = await supabase.from('places').upsert(batch, { onConflict: 'google_place_id' });
      if (error) { console.error(`Failed to upsert places batch ${i}:`, error.message); process.exit(1); }
    }
    insertedPlaces = placeRows.length;
    console.log(`Upserted ${insertedPlaces} places.`);
  }

  if (businessRows.length > 0) {
    for (let i = 0; i < businessRows.length; i += 50) {
      const batch = businessRows.slice(i, i + 50);
      const { error } = await supabase.from('businesses').upsert(batch, { onConflict: 'google_place_id' });
      if (error) { console.error(`Failed to upsert businesses batch ${i}:`, error.message); process.exit(1); }
    }
    insertedBiz = businessRows.length;
    console.log(`Upserted ${insertedBiz} businesses.`);
  }

  // Step e: Summary
  console.log('\n=== Final Summary ===');
  console.log(`Existing rows deactivated: ${deactivatedPlaces} places, ${deactivatedBiz} businesses`);
  console.log(`Research rows upserted: ${insertedPlaces} places, ${insertedBiz} businesses`);
  console.log('\nImport complete! Use --revert to restore manual data.');
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
