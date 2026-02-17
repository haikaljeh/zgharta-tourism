require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { requireEnv, DRY_RUN } = require('./lib/env');
const { placesRequest } = require('./lib/googlePlaces');
const { sleep } = require('./lib/utils');

const { GOOGLE_API_KEY } = requireEnv(['GOOGLE_API_KEY']);

// --- Config ---

const QUERIES = [
  'restaurants in Zgharta Lebanon',
  'restaurants in Ehden Lebanon',
  'restaurants in Miziara Lebanon',
  'restaurants in Kfarsghab Lebanon',
  'cafes in Zgharta Lebanon',
  'cafes in Ehden Lebanon',
  'hotels in Zgharta Lebanon',
  'hotels in Ehden Lebanon',
  'hotels in Miziara Lebanon',
  'shops in Zgharta Lebanon',
  'things to do in Zgharta Lebanon',
  'things to do in Ehden Lebanon',
  'churches in Zgharta Lebanon',
  'churches in Ehden Lebanon',
  'parks in Zgharta Lebanon',
  'nature in Ehden Lebanon',
  'heritage sites Zgharta Lebanon',
  'bakeries in Zgharta Lebanon',
  'bakeries in Ehden Lebanon',
  'grocery stores in Zgharta Lebanon',
  'grocery stores in Ehden Lebanon',
];

const BOUNDS = { minLat: 34.24, maxLat: 34.43, minLng: 35.82, maxLng: 36.01 };

const EXCLUDED_TYPES = new Set([
  'gas_station', 'atm', 'bank', 'post_office', 'police', 'fire_station',
  'courthouse', 'local_government_office', 'parking', 'car_wash', 'car_repair',
  'car_dealer', 'insurance_agency', 'lawyer', 'accounting', 'moving_company',
  'storage', 'electrician', 'plumber', 'roofing_contractor', 'painter',
  'locksmith', 'laundry', 'funeral_home', 'cemetery',
]);

const CATEGORY_MAP = {
  religious: ['place_of_worship', 'church', 'mosque'],
  nature: ['park', 'natural_feature', 'campground', 'hiking_area'],
  heritage: ['museum', 'tourist_attraction', 'library', 'art_gallery'],
  restaurant: ['restaurant', 'meal_delivery', 'meal_takeaway', 'food'],
  hotel: ['lodging', 'hotel', 'motel', 'guest_house'],
  cafe: ['cafe', 'bar', 'night_club'],
  shop: ['store', 'shopping_mall', 'supermarket', 'grocery_or_supermarket',
    'clothing_store', 'book_store', 'convenience_store', 'home_goods_store',
    'jewelry_store', 'shoe_store'],
};

const DETAIL_FIELDS = [
  'formatted_phone_number', 'website', 'opening_hours', 'reviews',
  'price_level', 'editorial_summary', 'place_id', 'name', 'geometry',
  'formatted_address', 'types', 'rating', 'user_ratings_total', 'photos',
].join(',');

const TEXT_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

// --- Helpers ---

function inBounds(lat, lng) {
  return lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat &&
         lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
}

function hasExcludedType(types) {
  return types.some(t => EXCLUDED_TYPES.has(t));
}

function categorize(types) {
  // Check categories in priority order
  const priorities = ['religious', 'nature', 'heritage', 'hotel', 'cafe', 'restaurant', 'shop'];
  for (const cat of priorities) {
    const catTypes = CATEGORY_MAP[cat];
    if (types.some(t => catTypes.includes(t))) {
      // Special handling: bakery goes to restaurant if food-related types present,
      // otherwise to shop
      if (cat === 'restaurant' && types.includes('bakery') && !types.includes('restaurant')) {
        // Bakery without restaurant type — check if it's primarily retail
        const hasShopType = types.some(t => CATEGORY_MAP.shop.includes(t));
        if (hasShopType) continue; // Let shop category pick it up
      }
      // Heritage: tourist_attraction shouldn't override food/lodging
      if (cat === 'heritage' && types.includes('tourist_attraction')) {
        const isFood = types.some(t => ['restaurant', 'food', 'cafe', 'bar'].includes(t));
        const isLodging = types.some(t => ['lodging', 'hotel'].includes(t));
        if (isFood || isLodging) continue;
      }
      return cat;
    }
  }
  // Bakery fallback
  if (types.includes('bakery')) return 'shop';
  return null;
}

function extractVillage(formattedAddress) {
  if (!formattedAddress) return 'Unknown';
  // Typical format: "Street, Village, Lebanon" or "Street, Village, Zgharta, Lebanon"
  const parts = formattedAddress.split(',').map(s => s.trim());
  // Known villages to match against
  const knownVillages = [
    'Ehden', 'Zgharta', 'Ardeh', 'Kfarsghab', 'Rachiine', 'Mejdlaya',
    'Miziara', 'Bsharri', 'Kfarhata', 'Kfarshakhna', 'Amioun',
    'Alma', 'Bkeftine', 'Kfardlakos', 'Daraya', 'Haref El Fouar',
    'Tallet Zgharta', 'Majdlaiya', 'Kfar Beit', 'Bnachii', 'Karm Saddeh',
    'Aardeh', 'Beit Aouker', 'Kousba',
  ];
  for (const part of parts) {
    for (const v of knownVillages) {
      if (part.toLowerCase().includes(v.toLowerCase())) return v;
    }
  }
  // Fallback: second-to-last part before "Lebanon"
  if (parts.length >= 3) return parts[parts.length - 3];
  if (parts.length >= 2) return parts[0];
  return 'Unknown';
}

// --- Main ---

async function textSearch(query) {
  const url = `${TEXT_SEARCH_URL}?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  const res = await placesRequest(url);
  if (!res.ok) return [];

  let results = res.data.results || [];
  let nextPageToken = res.data.next_page_token;

  while (nextPageToken) {
    await sleep(2000); // Google requires delay before using next_page_token
    const pageUrl = `${TEXT_SEARCH_URL}?pagetoken=${nextPageToken}&key=${GOOGLE_API_KEY}`;
    const pageRes = await placesRequest(pageUrl);
    if (!pageRes.ok) break;
    results = results.concat(pageRes.data.results || []);
    nextPageToken = pageRes.data.next_page_token;
  }

  return results;
}

async function fetchDetails(placeId) {
  const url = `${DETAILS_URL}?place_id=${placeId}&fields=${DETAIL_FIELDS}&key=${GOOGLE_API_KEY}`;
  const res = await placesRequest(url);
  if (!res.ok) return null;
  return res.data.result || null;
}

async function main() {
  console.log('=== Zgharta Caza Market Research ===\n');

  if (DRY_RUN) {
    console.log('DRY RUN — would execute the following queries:\n');
    QUERIES.forEach((q, i) => console.log(`  ${i + 1}. "${q}"`));
    console.log(`\nTotal: ${QUERIES.length} queries`);
    console.log('Each query may return up to 60 results (3 pages of 20).');
    console.log('Each result requires 1 Place Details call.');
    console.log(`\nWorst case estimate:`);
    console.log(`  Text Search calls: ${QUERIES.length * 3} (${QUERIES.length} queries × 3 pages)`);
    console.log(`  Details calls: ${QUERIES.length * 60} (${QUERIES.length} queries × 60 results)`);
    console.log(`  Estimated cost: $${((QUERIES.length * 3 * 32 + QUERIES.length * 60 * 17) / 1000).toFixed(2)}`);
    console.log('\nActual cost will be lower due to deduplication and fewer results per query.');
    return;
  }

  const allPlaces = new Map(); // place_id → place data
  let textSearchCalls = 0;
  let detailsCalls = 0;

  for (let i = 0; i < QUERIES.length; i++) {
    const query = QUERIES[i];
    console.log(`[${i + 1}/${QUERIES.length}] Searching: "${query}"`);

    const results = await textSearch(query);
    textSearchCalls += 1 + Math.ceil(Math.max(0, results.length - 20) / 20); // pages used

    let newCount = 0;
    for (const r of results) {
      if (allPlaces.has(r.place_id)) continue; // Deduplicate

      const loc = r.geometry?.location;
      if (!loc || !inBounds(loc.lat, loc.lng)) continue;

      const types = r.types || [];
      if (hasExcludedType(types)) continue;
      if (!r.rating || !r.user_ratings_total || r.user_ratings_total === 0) continue;

      // Fetch details
      console.log(`  Fetching details: ${r.name}`);
      const details = await fetchDetails(r.place_id);
      detailsCalls++;

      if (!details) {
        console.log(`  ⚠ Failed to get details for ${r.name}`);
        continue;
      }

      const mergedTypes = [...new Set([...(types), ...(details.types || [])])];
      const category = categorize(mergedTypes);
      if (!category) {
        console.log(`  Skipping ${r.name} — no matching category (types: ${mergedTypes.join(', ')})`);
        continue;
      }

      allPlaces.set(r.place_id, {
        place_id: r.place_id,
        name: details.name || r.name,
        formatted_address: details.formatted_address || r.formatted_address,
        village: extractVillage(details.formatted_address || r.formatted_address),
        types: mergedTypes,
        category,
        lat: loc.lat,
        lng: loc.lng,
        rating: details.rating || r.rating,
        user_ratings_total: details.user_ratings_total || r.user_ratings_total,
        price_level: details.price_level || null,
        formatted_phone_number: details.formatted_phone_number || null,
        website: details.website || null,
        opening_hours: details.opening_hours || null,
        editorial_summary: details.editorial_summary?.overview || null,
        reviews: (details.reviews || []).slice(0, 5), // Keep top 5 reviews
        photos: (details.photos || []).slice(0, 3), // Keep top 3 photo refs
      });
      newCount++;
      await sleep(100); // Gentle rate limiting
    }
    console.log(`  → ${results.length} results, ${newCount} new places added\n`);
  }

  // Summary
  const places = Array.from(allPlaces.values());
  const byCategory = {};
  for (const p of places) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  }

  console.log('=== Results Summary ===');
  console.log(`Total unique places: ${places.length}`);
  console.log('By category:');
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  // API cost estimate
  const textSearchCost = (textSearchCalls * 32) / 1000;
  const detailsCost = (detailsCalls * 17) / 1000;
  const totalCost = textSearchCost + detailsCost;
  console.log(`\n=== API Cost Estimate ===`);
  console.log(`Text Search calls: ${textSearchCalls} → $${textSearchCost.toFixed(2)}`);
  console.log(`Place Details calls: ${detailsCalls} → $${detailsCost.toFixed(2)}`);
  console.log(`Total estimated cost: $${totalCost.toFixed(2)}`);

  // Save
  const outPath = path.join(__dirname, '..', 'data', 'raw-places.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      queries: QUERIES,
      bounds: BOUNDS,
      textSearchCalls,
      detailsCalls,
      estimatedCost: totalCost,
    },
    places,
  }, null, 2));
  console.log(`\nSaved ${places.length} places to ${outPath}`);
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
