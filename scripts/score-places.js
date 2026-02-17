const fs = require('fs');
const path = require('path');

// --- Config ---

const M = 10; // Minimum reviews for Bayesian weighting
const DEFAULT_PERCENTILE = 10;

// Parse --percentile flag
function getPercentile() {
  const idx = process.argv.indexOf('--percentile');
  if (idx !== -1 && process.argv[idx + 1]) {
    const val = parseInt(process.argv[idx + 1], 10);
    if (val > 0 && val <= 100) return val;
    console.error('Invalid --percentile value. Must be 1-100.');
    process.exit(1);
  }
  return DEFAULT_PERCENTILE;
}

// --- Main ---

function main() {
  const percentile = getPercentile();
  const inputPath = path.join(__dirname, '..', 'data', 'raw-places.json');

  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    console.error('Run "npm run research" first to collect data.');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const places = raw.places;

  if (!places || places.length === 0) {
    console.error('No places found in raw data.');
    process.exit(1);
  }

  // Compute global average rating (C)
  const C = places.reduce((sum, p) => sum + p.rating, 0) / places.length;

  // Score each place
  for (const p of places) {
    const R = p.rating;
    const v = p.user_ratings_total;
    p.score = (v / (v + M)) * R + (M / (v + M)) * C;
  }

  // Sort by score descending
  places.sort((a, b) => b.score - a.score);

  // Category breakdown
  const categories = [...new Set(places.map(p => p.category))].sort();
  const byCategory = {};
  for (const cat of categories) {
    byCategory[cat] = places.filter(p => p.category === cat).sort((a, b) => b.score - a.score);
  }

  // Summary stats
  const avgRating = (places.reduce((s, p) => s + p.rating, 0) / places.length).toFixed(2);
  const avgReviews = Math.round(places.reduce((s, p) => s + p.user_ratings_total, 0) / places.length);

  console.log('=== Scoring Summary ===');
  console.log(`Total places: ${places.length}`);
  console.log(`Global average rating (C): ${C.toFixed(2)}`);
  console.log(`Average reviews: ${avgReviews}`);
  console.log(`Percentile cutoff: top ${percentile}%`);
  console.log('\nBy category:');
  for (const cat of categories) {
    console.log(`  ${cat}: ${byCategory[cat].length}`);
  }

  // Determine cutoffs
  const topCutoffIdx = Math.max(1, Math.ceil(places.length * percentile / 100));
  const bottomCutoffIdx = Math.ceil(places.length * 0.75);

  const topPlaces = places.slice(0, topCutoffIdx);
  const bottomPlaces = places.slice(bottomCutoffIdx);
  const middlePlaces = places.slice(topCutoffIdx, bottomCutoffIdx);

  console.log(`\nTop ${percentile}%: ${topPlaces.length} places`);
  if (topPlaces.length < 80) console.log('⚠ WARNING: Fewer than 80 top places. Consider increasing --percentile.');
  if (topPlaces.length > 150) console.log('⚠ WARNING: More than 150 top places. Consider decreasing --percentile.');

  // Generate report
  const lines = [];
  lines.push('# Zgharta Caza — Top Places Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Percentile: top ${percentile}% | Bayesian m=${M} | Global avg C=${C.toFixed(2)}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total places | ${places.length} |`);
  lines.push(`| Average rating | ${avgRating} |`);
  lines.push(`| Average reviews | ${avgReviews} |`);
  lines.push(`| Top ${percentile}% count | ${topPlaces.length} |`);
  lines.push(`| Bottom 25% count | ${bottomPlaces.length} |`);
  lines.push('');
  lines.push('### Category Breakdown');
  lines.push('');
  lines.push('| Category | Count |');
  lines.push('|----------|-------|');
  for (const cat of categories) {
    lines.push(`| ${cat} | ${byCategory[cat].length} |`);
  }
  lines.push('');

  // Top places by category
  for (const cat of categories) {
    const catPlaces = byCategory[cat];
    const catTopIdx = Math.max(1, Math.ceil(catPlaces.length * percentile / 100));
    const catTop = catPlaces.slice(0, catTopIdx);

    lines.push(`## ${cat.charAt(0).toUpperCase() + cat.slice(1)} — Top ${percentile}% (${catTop.length} of ${catPlaces.length})`);
    lines.push('');
    lines.push('| Rank | Name | Village | Rating | Reviews | Score | Phone | Website | Maps |');
    lines.push('|------|------|---------|--------|---------|-------|-------|---------|------|');
    catTop.forEach((p, i) => {
      const phone = p.formatted_phone_number || '—';
      const website = p.website ? `[Link](${p.website})` : '—';
      const maps = `[Map](https://www.google.com/maps/place/?q=place_id:${p.place_id})`;
      lines.push(`| ${i + 1} | ${p.name} | ${p.village} | ${p.rating} | ${p.user_ratings_total} | ${p.score.toFixed(2)} | ${phone} | ${website} | ${maps} |`);
    });
    lines.push('');
  }

  // Not recommended (bottom 25%)
  lines.push('## Not Recommended (Bottom 25%)');
  lines.push('');
  lines.push('| Name | Category | Village | Rating | Reviews | Score |');
  lines.push('|------|----------|---------|--------|---------|-------|');
  for (const p of bottomPlaces) {
    lines.push(`| ${p.name} | ${p.category} | ${p.village} | ${p.rating} | ${p.user_ratings_total} | ${p.score.toFixed(2)} |`);
  }
  lines.push('');

  // Honorable mentions
  lines.push('## Honorable Mentions');
  lines.push('');
  lines.push('| Name | Category | Score |');
  lines.push('|------|----------|-------|');
  for (const p of middlePlaces) {
    lines.push(`| ${p.name} | ${p.category} | ${p.score.toFixed(2)} |`);
  }
  lines.push('');

  // Write report
  const reportPath = path.join(__dirname, '..', 'data', 'top-places-report.md');
  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`\nReport saved to ${reportPath}`);

  // Save scored data
  const scoredPath = path.join(__dirname, '..', 'data', 'scored-places.json');
  fs.writeFileSync(scoredPath, JSON.stringify({
    metadata: {
      ...raw.metadata,
      scoredAt: new Date().toISOString(),
      globalAvgRating: C,
      bayesianM: M,
      percentile,
      topCount: topPlaces.length,
      bottomCount: bottomPlaces.length,
    },
    places,
  }, null, 2));
  console.log(`Scored data saved to ${scoredPath}`);
}

main();
