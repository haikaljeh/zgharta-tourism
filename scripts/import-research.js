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

async function main() {
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
        featured: isFeatured,
        google_place_id: p.place_id,
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
    console.log(`\nWould ${KEEP_EXISTING ? 'upsert' : 'DELETE ALL existing data and insert'}:`);
    console.log(`  ${placeRows.length} places`);
    console.log(`  ${businessRows.length} businesses`);

    // Show a sample
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

  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (!KEEP_EXISTING) {
    console.log('\nDeleting existing data...');

    const { error: delPlaces } = await supabase.from('places').delete().neq('id', 0);
    if (delPlaces) { console.error('Failed to delete places:', delPlaces.message); process.exit(1); }
    console.log('  Deleted all rows from places table.');

    const { error: delBiz } = await supabase.from('businesses').delete().neq('id', 0);
    if (delBiz) { console.error('Failed to delete businesses:', delBiz.message); process.exit(1); }
    console.log('  Deleted all rows from businesses table.');
  }

  // Insert places
  if (placeRows.length > 0) {
    if (KEEP_EXISTING) {
      // Upsert by google_place_id
      const { error } = await supabase.from('places').upsert(placeRows, { onConflict: 'google_place_id' });
      if (error) { console.error('Failed to upsert places:', error.message); process.exit(1); }
    } else {
      // Batch insert in chunks of 50
      for (let i = 0; i < placeRows.length; i += 50) {
        const batch = placeRows.slice(i, i + 50);
        const { error } = await supabase.from('places').insert(batch);
        if (error) { console.error(`Failed to insert places batch ${i}:`, error.message); process.exit(1); }
      }
    }
    console.log(`Inserted ${placeRows.length} places.`);
  }

  // Insert businesses
  if (businessRows.length > 0) {
    if (KEEP_EXISTING) {
      const { error } = await supabase.from('businesses').upsert(businessRows, { onConflict: 'google_place_id' });
      if (error) { console.error('Failed to upsert businesses:', error.message); process.exit(1); }
    } else {
      for (let i = 0; i < businessRows.length; i += 50) {
        const batch = businessRows.slice(i, i + 50);
        const { error } = await supabase.from('businesses').insert(batch);
        if (error) { console.error(`Failed to insert businesses batch ${i}:`, error.message); process.exit(1); }
      }
    }
    console.log(`Inserted ${businessRows.length} businesses.`);
  }

  console.log('\nImport complete!');
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
