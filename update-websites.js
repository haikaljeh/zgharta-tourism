#!/usr/bin/env node
// =============================================
// WEBSITE UPDATER
// Finds and adds website URLs for existing businesses
// =============================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mhohpseegfnfzycxvcuk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ob2hwc2VlZ2ZuZnp5Y3h2Y3VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQxNzA1MSwiZXhwIjoyMDgzOTkzMDUxfQ.pv0Ic0bvyCpt0np5Orm711n15TS54V1dzpNBE_J-7yU';
const GOOGLE_API_KEY = 'AIzaSyAMbrfgFy4sD0HemSdDU1SkQxUJbQMW9i8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function findWebsite(name, village) {
  const query = `${name} ${village} Lebanon`;
  const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${GOOGLE_API_KEY}`;
  
  try {
    const res = await fetch(searchUrl);
    const data = await res.json();
    if (!data.candidates?.length) return null;

    await sleep(200);
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${data.candidates[0].place_id}&fields=website,formatted_phone_number,international_phone_number&key=${GOOGLE_API_KEY}`;
    const dRes = await fetch(detailsUrl);
    const dData = await dRes.json();
    return {
      website: dData.result?.website || null,
      phone: dData.result?.international_phone_number || dData.result?.formatted_phone_number || null
    };
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('🔗 Website & Phone Updater\n');

  if (SUPABASE_SERVICE_KEY.includes('YOUR_')) { console.error('❌ Set your SUPABASE_SERVICE_KEY'); process.exit(1); }
  if (GOOGLE_API_KEY.includes('YOUR_')) { console.error('❌ Set your GOOGLE_API_KEY'); process.exit(1); }

  const { data: businesses, error } = await supabase.from('businesses').select('*');
  if (error) { console.error('❌', error.message); process.exit(1); }

  console.log(`Found ${businesses.length} businesses\n`);

  let updated = 0;
  for (const biz of businesses) {
    // Skip if already has both website and phone
    if (biz.website && biz.phone) {
      console.log(`  ⏭  ${biz.name} — already has website & phone`);
      continue;
    }

    console.log(`  🔍 ${biz.name}...`);
    await sleep(300);

    const result = await findWebsite(biz.name, biz.village);
    if (!result) { console.log(`     No results found`); continue; }

    const updates = {};
    if (result.website && !biz.website) updates.website = result.website;
    if (result.phone && !biz.phone) updates.phone = result.phone;

    if (Object.keys(updates).length === 0) {
      console.log(`     No new data to add`);
      continue;
    }

    const { error: upErr } = await supabase.from('businesses').update(updates).eq('id', biz.id);
    if (upErr) {
      console.log(`     ❌ Update failed: ${upErr.message}`);
    } else {
      updated++;
      console.log(`     ✅ Added: ${Object.keys(updates).join(', ')}`);
      if (updates.website) console.log(`        🌐 ${updates.website}`);
      if (updates.phone) console.log(`        📞 ${updates.phone}`);
    }
  }

  console.log(`\n🎉 Done! Updated ${updated} businesses.`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
