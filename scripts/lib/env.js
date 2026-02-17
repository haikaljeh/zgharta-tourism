// Validates that required environment variables are set.
// Exits with code 1 and helpful message if any are missing.
function requireEnv(names) {
  const missing = names.filter(n => !process.env[n]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in your values.');
    process.exit(1);
  }
  const env = {};
  for (const n of names) env[n] = process.env[n];
  return env;
}

const DRY_RUN = process.argv.includes('--dry-run');

module.exports = { requireEnv, DRY_RUN };
