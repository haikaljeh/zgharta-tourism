#!/usr/bin/env node
// =============================================
// OUT-OF-DISTRICT CLEANUP
// =============================================
// Deactivates entries outside the Zgharta caza:
// - Coordinates outside bounding box (lat 34.24-34.43, lng 35.82-36.01)
// - Village names matching known out-of-district areas
// - Plus Code patterns in village names
//
// USAGE:
//   node scripts/clean-out-of-district.js
//   node scripts/clean-out-of-district.js --dry-run
//
// REQUIRES:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY env vars
// =============================================

const { requireEnv, DRY_RUN } = require('./lib/env');
const { createSupabaseClient } = require('./lib/supabase');

const env = requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Zgharta caza bounding box
const BOUNDS = { minLat: 34.24, maxLat: 34.43, minLng: 35.82, maxLng: 36.01 };

// Known out-of-district village/area names (lowercase for matching)
const OUT_OF_DISTRICT = [
  'tripoli', 'tripoly', 'batroun', 'bsharri', 'bcharre', 'bcharri', 'bcharreh',
  'koura', 'akkar', 'miniyeh', 'minieh', 'danniyeh', 'dinniyeh',
  'beirut', 'jounieh', 'jbeil', 'byblos', 'saida', 'sidon', 'tyre', 'sour',
];

// Plus Code pattern: typically looks like "C93V+X6" or similar alphanumeric+plus patterns
const PLUS_CODE_RE = /^[A-Z0-9]{4,}\+[A-Z0-9]+/i;

function isOutOfBounds(item) {
  const lat = item.latitude;
  const lng = item.longitude;
  if (lat == null || lng == null) return false; // no coords = can't determine, skip
  return lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng;
}

function isOutOfDistrictVillage(village) {
  if (!village) return false;
  const lower = village.trim().toLowerCase();
  // Check against known out-of-district names
  for (const name of OUT_OF_DISTRICT) {
    if (lower.includes(name)) return true;
  }
  // Check for Plus Code patterns
  if (PLUS_CODE_RE.test(village.trim())) return true;
  return false;
}

async function processTable(table) {
  const { data: items, error } = await supabase
    .from(table)
    .select('*')
    .eq('active', true);
  if (error) { console.error(`Failed to fetch ${table}:`, error.message); process.exit(1); }

  console.log(`\n${table.toUpperCase()} — ${items.length} active entries`);
  console.log('-'.repeat(50));

  const flagged = [];

  for (const item of items) {
    const reasons = [];
    if (isOutOfBounds(item)) {
      reasons.push(`coords outside bounds (${item.latitude}, ${item.longitude})`);
    }
    if (isOutOfDistrictVillage(item.village)) {
      reasons.push(`village "${item.village}" is out of district`);
    }
    if (reasons.length > 0) {
      flagged.push({ item, reasons });
    }
  }

  if (flagged.length === 0) {
    console.log('  All entries are within Zgharta caza — nothing to clean.');
    return 0;
  }

  let deactivated = 0;
  for (const { item, reasons } of flagged) {
    const reasonStr = reasons.join('; ');
    const coords = item.latitude != null ? `${item.latitude}, ${item.longitude}` : 'no coords';

    if (DRY_RUN) {
      console.log(`  Would deactivate: ${item.name} (${item.category}, village: ${item.village || 'N/A'}, ${coords})`);
      console.log(`    Reason: ${reasonStr}`);
    } else {
      const { error: updErr } = await supabase
        .from(table)
        .update({ active: false })
        .eq('id', item.id);

      if (updErr) {
        console.log(`  DB error deactivating ${item.name}: ${updErr.message}`);
        continue;
      }
      console.log(`  Deactivated: ${item.name} (${item.category}, village: ${item.village || 'N/A'}, ${coords})`);
      console.log(`    Reason: ${reasonStr}`);
    }
    deactivated++;
  }

  return deactivated;
}

async function main() {
  console.log('Zgharta Tourism App — Out-of-District Cleanup');
  console.log('=========================================');
  if (DRY_RUN) console.log('** DRY RUN — no database writes **\n');

  const placesDeactivated = await processTable('places');
  const bizDeactivated = await processTable('businesses');

  const total = placesDeactivated + bizDeactivated;
  console.log('\n=========================================');
  console.log(`Done! ${total} entries deactivated as out-of-district.`);
  console.log('=========================================\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
