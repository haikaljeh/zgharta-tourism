#!/usr/bin/env node
// =============================================
// PHOTO DIAGNOSTIC - Check image URL health
// =============================================
// Queries all active places & businesses, checks:
// - How many have NULL/empty image fields
// - Whether existing image URLs actually resolve (HEAD request)
//
// USAGE:
//   node scripts/check-photos.js
//
// REQUIRES:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY env vars
// =============================================

const { requireEnv } = require('./lib/env');
const { createSupabaseClient } = require('./lib/supabase');

const env = requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return { ok: res.ok, status: res.status, contentType: res.headers.get('content-type') };
  } catch (err) {
    return { ok: false, status: null, error: err.message };
  }
}

async function diagnoseTable(table, items) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`${table.toUpperCase()} (${items.length} active entries)`);
  console.log('='.repeat(50));

  const noImage = items.filter(i => !i.image_url);
  const withImage = items.filter(i => !!i.image_url);

  console.log(`  ${noImage.length} entries with NO image`);
  console.log(`  ${withImage.length} entries with an image URL`);

  if (noImage.length > 0) {
    console.log(`\n  Entries missing images:`);
    for (const item of noImage) {
      console.log(`    - ${item.name} (${item.category}, ${item.village})`);
    }
  }

  if (withImage.length === 0) {
    return { noImage: noImage.length, withImage: 0, working: 0, broken: 0, workingUrls: [], brokenUrls: [] };
  }

  // Test up to 10 URLs
  const sample = withImage.slice(0, 10);
  console.log(`\n  Testing ${sample.length} image URLs...`);

  const working = [];
  const broken = [];

  for (const item of sample) {
    const result = await checkUrl(item.image_url);
    if (result.ok) {
      working.push({ name: item.name, url: item.image_url, status: result.status, contentType: result.contentType });
    } else {
      broken.push({ name: item.name, url: item.image_url, status: result.status, error: result.error });
    }
  }

  console.log(`\n  Results: ${working.length} working, ${broken.length} broken (out of ${sample.length} tested)`);

  if (working.length > 0) {
    console.log(`\n  Sample WORKING URLs:`);
    for (const w of working.slice(0, 3)) {
      console.log(`    ${w.name}`);
      console.log(`      Status: ${w.status}, Content-Type: ${w.contentType}`);
      console.log(`      ${w.url.substring(0, 120)}${w.url.length > 120 ? '...' : ''}`);
    }
  }

  if (broken.length > 0) {
    console.log(`\n  Sample BROKEN URLs:`);
    for (const b of broken.slice(0, 3)) {
      console.log(`    ${b.name}`);
      console.log(`      Status: ${b.status || 'N/A'}, Error: ${b.error || 'HTTP error'}`);
      console.log(`      ${b.url.substring(0, 120)}${b.url.length > 120 ? '...' : ''}`);
    }
  }

  // Analyze URL patterns
  const patterns = {};
  for (const item of withImage) {
    let pattern;
    if (item.image_url.includes('photo_reference')) pattern = 'Google photo_reference URL';
    else if (item.image_url.includes('googleapis.com/maps/api/place/photo')) pattern = 'Google Places Photo API URL';
    else if (item.image_url.includes('supabase')) pattern = 'Supabase Storage URL';
    else if (item.image_url.includes('googleusercontent')) pattern = 'Google User Content URL';
    else pattern = 'Other';
    patterns[pattern] = (patterns[pattern] || 0) + 1;
  }
  console.log(`\n  URL patterns:`);
  for (const [pattern, count] of Object.entries(patterns).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${pattern}: ${count}`);
  }

  return {
    noImage: noImage.length,
    withImage: withImage.length,
    working: working.length,
    broken: broken.length,
    workingUrls: working,
    brokenUrls: broken,
  };
}

async function main() {
  console.log('Zgharta Tourism App — Photo Diagnostic');
  console.log('=========================================');

  const { data: places, error: pErr } = await supabase
    .from('places')
    .select('*')
    .eq('active', true);
  if (pErr) { console.error('Failed to fetch places:', pErr.message); process.exit(1); }

  const { data: businesses, error: bErr } = await supabase
    .from('businesses')
    .select('*')
    .eq('active', true);
  if (bErr) { console.error('Failed to fetch businesses:', bErr.message); process.exit(1); }

  const pResult = await diagnoseTable('places', places);
  const bResult = await diagnoseTable('businesses', businesses);

  console.log('\n=========================================');
  console.log('TOTALS');
  console.log('=========================================');
  console.log(`  ${pResult.noImage + bResult.noImage} entries with no image`);
  console.log(`  ${pResult.withImage + bResult.withImage} entries with image URL`);
  console.log(`  ${pResult.working + bResult.working}/${(pResult.working + pResult.broken) + (bResult.working + bResult.broken)} tested URLs working`);
  console.log(`  ${pResult.broken + bResult.broken}/${(pResult.working + pResult.broken) + (bResult.working + bResult.broken)} tested URLs broken`);
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
