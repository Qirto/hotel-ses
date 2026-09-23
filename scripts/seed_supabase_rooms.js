const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables if needed
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://smkwemugjinusfpiyrpn.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_xubgYj7DdT1VI8ndyxSJ4g_QlvcRIKk';

const supabase = createClient(supabaseUrl, supabaseKey);

function generateAllRooms() {
  const rooms = [];

  // ====================================================
  // BLOCK A
  // ====================================================
  // Right side: odd numbers (1001-1067, 2001-2067, 3001-3067), skip ending in 13
  const blockARightFloors = [
    { floorName: 'Ground Floor', level: 0, start: 1001, end: 1067 },
    { floorName: 'First Floor', level: 1, start: 2001, end: 2067 },
    { floorName: 'Second Floor', level: 2, start: 3001, end: 3067 },
  ];

  for (const f of blockARightFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        rooms.push({
          room_number: n.toString(),
          block: 'A',
          floor_level: f.level,
          floor_name: f.floorName,
          side: 'Right',
          room_type: f.level === 2 ? 'Deluxe' : 'Standard',
          status: 'available',
          price_per_night: f.level === 2 ? 140.00 : 100.00,
        });
      }
    }
  }

  // Left side: even numbers (1002-1054, 2002-2054, 3002-3052), skip ending in 13
  const blockALeftFloors = [
    { floorName: 'Ground Floor', level: 0, start: 1002, end: 1054 },
    { floorName: 'First Floor', level: 1, start: 2002, end: 2054 },
    { floorName: 'Second Floor', level: 2, start: 3002, end: 3052 },
  ];

  for (const f of blockALeftFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        rooms.push({
          room_number: n.toString(),
          block: 'A',
          floor_level: f.level,
          floor_name: f.floorName,
          side: 'Left',
          room_type: f.level === 2 ? 'Deluxe' : 'Standard',
          status: 'available',
          price_per_night: f.level === 2 ? 140.00 : 100.00,
        });
      }
    }
  }

  // ====================================================
  // BLOCK B
  // ====================================================
  // Left side: odd numbers (1071-1135, 2071-2135, 3091-3133), skip ending in 13
  const blockBLeftFloors = [
    { floorName: 'Ground Floor', level: 0, start: 1071, end: 1135 },
    { floorName: 'First Floor', level: 1, start: 2071, end: 2135 },
    { floorName: 'Second Floor', level: 2, start: 3091, end: 3133 },
  ];

  for (const f of blockBLeftFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        rooms.push({
          room_number: n.toString(),
          block: 'B',
          floor_level: f.level,
          floor_name: f.floorName,
          side: 'Left',
          room_type: f.level === 2 ? 'Deluxe' : 'Standard',
          status: 'available',
          price_per_night: f.level === 2 ? 140.00 : 100.00,
        });
      }
    }
  }

  // Right side: even numbers (1070-1120, 2070-2120, 3070-3118), skip ending in 13
  const blockBRightFloors = [
    { floorName: 'Ground Floor', level: 0, start: 1070, end: 1120 },
    { floorName: 'First Floor', level: 1, start: 2070, end: 2120 },
    { floorName: 'Second Floor', level: 2, start: 3070, end: 3118 },
  ];

  for (const f of blockBRightFloors) {
    for (let n = f.start; n <= f.end; n += 2) {
      if (n % 100 !== 13) {
        rooms.push({
          room_number: n.toString(),
          block: 'B',
          floor_level: f.level,
          floor_name: f.floorName,
          side: 'Right',
          room_type: f.level === 2 ? 'Deluxe' : 'Standard',
          status: 'available',
          price_per_night: f.level === 2 ? 140.00 : 100.00,
        });
      }
    }
  }

  return rooms;
}

async function seedDatabase() {
  const rooms = generateAllRooms();
  console.log(`Starting Supabase seed for ${rooms.length} hotel rooms...`);

  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < rooms.length; i += BATCH_SIZE) {
    const batch = rooms.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('rooms')
      .upsert(batch, { onConflict: 'room_number' });

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
