#!/usr/bin/env node
// =============================================
// PHOTO FIXER - Recover, Fetch, Deactivate
// =============================================
// This script runs 3 parts in sequence:
//   Part 1: Recover photos from inactive/old entries (by google_place_id or name match)
//   Part 2: Fetch photos from Google Places API for remaining missing
//   Part 3: Deactivate entries that still have no photo
//
// USAGE:
//   node scripts/fix-photos.js
//   node scripts/fix-photos.js --dry-run
//   node scripts/fix-photos.js --skip-deactivate
//
// REQUIRES:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY env vars
// =============================================

const { requireEnv, DRY_RUN } = require('./lib/env');
const { createSupabaseClient } = require('./lib/supabase');
const { findPlace, getDetails, photoUrl } = require('./lib/googlePlaces');
const { sleep, FailureTracker } = require('./lib/utils');

const SKIP_DEACTIVATE = process.argv.includes('--skip-deactivate');
const DELAY_MS = 200;

const env = requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_API_KEY']);
const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Normalize a name for fuzzy matching: lowercase, trim, strip diacritics
function normalizeName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Build lookup maps from inactive entries that have images
function buildInactiveLookup(inactiveItems) {
  const byPlaceId = {};  // google_place_id → item
  const byName = {};     // normalized(name + '|' + village) → item

  for (const item of inactiveItems) {
    if (!item.image_url) continue;

    if (item.google_place_id) {
      byPlaceId[item.google_place_id] = item;
    }

    const key = normalizeName(item.name) + '|' + normalizeName(item.village);
    byName[key] = item;
  }

  return { byPlaceId, byName };
}

// Part 1: Recover photos from inactive entries
async function recoverPhotos(table, activeItems, lookup) {
  const { byPlaceId, byName } = lookup;
  let recovered = 0;
  const stillMissing = [];

  for (const item of activeItems) {
    if (item.image_url) continue;

    // Try matching by google_place_id first
    let donor = null;
    if (item.google_place_id && byPlaceId[item.google_place_id]) {
      donor = byPlaceId[item.google_place_id];
    }

    // Fallback: match by normalized name + village
    if (!donor) {
      const key = normalizeName(item.name) + '|' + normalizeName(item.village);
      if (byName[key]) {
        donor = byName[key];
      }
    }

    if (donor) {
      if (DRY_RUN) {
        console.log(`  Would recover photo for ${item.name} from old entry`);
      } else {
        const { error } = await supabase
          .from(table)
          .update({ image_url: donor.image_url })
          .eq('id', item.id);

        if (error) {
          console.log(`  DB error recovering photo for ${item.name}: ${error.message}`);
          stillMissing.push(item);
          continue;
        }
        console.log(`  Recovered photo for ${item.name} from old entry`);
        item.image_url = donor.image_url;  // update in-memory for subsequent parts
      }
      recovered++;
    } else {
      stillMissing.push(item);
    }
  }

  return { recovered, stillMissing };
}

// Part 2: Fetch photos from Google for remaining missing
async function fetchPhotos(table, items, failures) {
  let fetched = 0;
  const stillMissing = [];

  for (const item of items) {
    let photoRef = null;
    let placeId = item.google_place_id;

    // If we have a google_place_id, get details directly
    if (placeId) {
      await sleep(DELAY_MS);
      const detailsRes = await getDetails(placeId, env.GOOGLE_API_KEY);
      if (detailsRes.ok && detailsRes.result?.photos?.length > 0) {
        photoRef = detailsRes.result.photos[0].photo_reference;
      }
    }

    // If no place_id or no photo from details, try Find Place search
    if (!photoRef) {
      await sleep(DELAY_MS);
      const query = `${item.name} ${item.village || ''} Lebanon`.trim();
      const searchRes = await findPlace(query, env.GOOGLE_API_KEY);
      if (searchRes.ok) {
        if (searchRes.candidate.photos?.length > 0) {
          photoRef = searchRes.candidate.photos[0].photo_reference;
        } else if (searchRes.candidate.place_id) {
          // Got a place_id but no photos in find result, try details
          await sleep(DELAY_MS);
          const detailsRes = await getDetails(searchRes.candidate.place_id, env.GOOGLE_API_KEY);
          if (detailsRes.ok && detailsRes.result?.photos?.length > 0) {
            photoRef = detailsRes.result.photos[0].photo_reference;
          }
        }
      }
    }

    if (!photoRef) {
      console.log(`  No photo found for ${item.name} (${item.village})`);
      failures.add('NO_PHOTOS', item.name);
      stillMissing.push(item);
      continue;
    }

    const imageUrl = photoUrl(photoRef, env.GOOGLE_API_KEY, 800);

    if (DRY_RUN) {
      console.log(`  Would fetch photo for ${item.name} from Google API`);
      fetched++;
      continue;
    }

    const { error } = await supabase
      .from(table)
      .update({ image_url: imageUrl })
      .eq('id', item.id);

    if (error) {
      console.log(`  DB error saving photo for ${item.name}: ${error.message}`);
      failures.add('DB_UPDATE_FAILED', item.name);
      stillMissing.push(item);
      continue;
    }

    console.log(`  Fetched photo for ${item.name} from Google API`);
    item.image_url = imageUrl;
    fetched++;
  }

  return { fetched, stillMissing };
}

// Part 3: Deactivate entries still missing photos
async function deactivateNoPhoto(table, items) {
  let deactivated = 0;

  for (const item of items) {
    if (DRY_RUN) {
      console.log(`  Would deactivate ${item.name} (${item.category}, ${item.village}) — no photo available`);
    } else {
      const { error } = await supabase
        .from(table)
        .update({ active: false })
        .eq('id', item.id);

      if (error) {
        console.log(`  DB error deactivating ${item.name}: ${error.message}`);
        continue;
      }
      console.log(`  Deactivated ${item.name} (${item.category}, ${item.village}) — no photo available`);
    }
    deactivated++;
  }

  return deactivated;
}

async function processTable(table) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Processing ${table}`);
  console.log('='.repeat(50));

  // Fetch active entries missing photos
  const { data: allActive, error: aErr } = await supabase
    .from(table)
    .select('*')
    .eq('active', true);
  if (aErr) { console.error(`Failed to fetch active ${table}:`, aErr.message); process.exit(1); }

  // Fetch inactive entries (potential photo donors)
  const { data: inactive, error: iErr } = await supabase
    .from(table)
    .select('*')
    .eq('active', false);
  if (iErr) { console.error(`Failed to fetch inactive ${table}:`, iErr.message); process.exit(1); }

  const missingPhoto = allActive.filter(i => !i.image_url);
  const withPhoto = allActive.length - missingPhoto.length;

  console.log(`  ${allActive.length} active entries (${withPhoto} with photos, ${missingPhoto.length} missing)`);
  console.log(`  ${inactive.length} inactive entries available as photo donors`);

  if (missingPhoto.length === 0) {
    console.log(`  All ${table} have photos — nothing to do!`);
    return { recovered: 0, fetched: 0, deactivated: 0, totalActive: allActive.length, byCategory: {} };
  }

  // Part 1: Recover from old entries
  console.log(`\n--- Part 1: Recovering photos from old entries ---`);
  const lookup = buildInactiveLookup(inactive);
  const part1 = await recoverPhotos(table, missingPhoto, lookup);
  console.log(`  ${part1.recovered} recovered, ${part1.stillMissing.length} still missing`);

  // Part 2: Fetch from Google API
  console.log(`\n--- Part 2: Fetching photos from Google API ---`);
  const failures = new FailureTracker();
  const part2 = await fetchPhotos(table, part1.stillMissing, failures);
  console.log(`  ${part2.fetched} fetched, ${part2.stillMissing.length} still missing`);
  failures.print();

  // Part 3: Deactivate entries with no photo
  let deactivated = 0;
  if (part2.stillMissing.length > 0 && !SKIP_DEACTIVATE) {
    console.log(`\n--- Part 3: Deactivating entries with no photo ---`);
    deactivated = await deactivateNoPhoto(table, part2.stillMissing);
    console.log(`  ${deactivated} deactivated`);
  } else if (part2.stillMissing.length > 0 && SKIP_DEACTIVATE) {
    console.log(`\n--- Part 3: Skipped (--skip-deactivate) ---`);
    console.log(`  ${part2.stillMissing.length} entries would be deactivated:`);
    for (const item of part2.stillMissing) {
      console.log(`    - ${item.name} (${item.category}, ${item.village})`);
    }
  }

  // Category breakdown of remaining active
  const activeRemaining = allActive.length - deactivated;
  const byCategory = {};
  for (const item of allActive) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  }
  // Subtract deactivated items from their categories
  for (const item of part2.stillMissing.slice(0, deactivated)) {
    if (byCategory[item.category]) byCategory[item.category]--;
  }

  return {
    recovered: part1.recovered,
    fetched: part2.fetched,
    deactivated,
    totalActive: activeRemaining,
    byCategory,
  };
}

async function main() {
  console.log('Zgharta Tourism App — Photo Fixer');
  console.log('=========================================');
  if (DRY_RUN) console.log('** DRY RUN — no database writes **');
  if (SKIP_DEACTIVATE) console.log('** SKIP DEACTIVATE — Part 3 will be skipped **');
  console.log('');

  const placesResult = await processTable('places');
  const bizResult = await processTable('businesses');

  // Final summary
  const totalRecovered = placesResult.recovered + bizResult.recovered;
  const totalFetched = placesResult.fetched + bizResult.fetched;
  const totalDeactivated = placesResult.deactivated + bizResult.deactivated;
  const totalActive = placesResult.totalActive + bizResult.totalActive;

  console.log('\n=========================================');
  console.log('FINAL SUMMARY');
  console.log('=========================================');
  console.log(`  ${totalRecovered} photos recovered from old entries`);
  console.log(`  ${totalFetched} photos fetched from Google API`);
  console.log(`  ${totalDeactivated} entries deactivated (no photo found)`);
  console.log(`  ${totalActive} total active entries remaining`);

  // Combined category breakdown
  const combined = {};
  for (const result of [placesResult, bizResult]) {
    for (const [cat, count] of Object.entries(result.byCategory)) {
      combined[cat] = (combined[cat] || 0) + count;
    }
  }
  if (Object.keys(combined).length > 0) {
    console.log('\n  Breakdown by category:');
    for (const [cat, count] of Object.entries(combined).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${cat}: ${count}`);
    }
  }

  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
