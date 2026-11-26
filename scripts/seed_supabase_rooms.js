const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { hotelRooms } = require('./room_layout');

// Load environment variables if available in .env or .env.local
const envPath = fs.existsSync(path.resolve(__dirname, '../.env.local'))
  ? path.resolve(__dirname, '../.env.local')
  : path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in environment or .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  const rooms = hotelRooms(); // one layout for every script: see room_layout.js
  console.log(`Starting Supabase seed for ${rooms.length} hotel rooms...`);

  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < rooms.length; i += BATCH_SIZE) {
    const batch = rooms.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('rooms')
      .upsert(batch, { onConflict: 'room_number', ignoreDuplicates: true }); // add missing rooms; never reset live occupancy or cleaning

    if (error) {
      console.error(`Error in batch ${i} - ${i + batch.length}:`, error);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`Progress: ${inserted} / ${rooms.length} rooms seeded.`);
  }

  // Verify total count in Supabase
  const { count, error: countErr } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.warn('Could not verify count:', countErr);
  } else {
    console.log(`\nSUCCESS! Exactly ${count} hotel rooms are now live in your Supabase database!`);
  }
}

seedDatabase().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
