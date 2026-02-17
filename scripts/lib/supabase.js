const { createClient } = require('@supabase/supabase-js');

// Creates a Supabase admin client using service role key.
function createSupabaseClient(url, serviceKey) {
  return createClient(url, serviceKey);
}

module.exports = { createSupabaseClient };
