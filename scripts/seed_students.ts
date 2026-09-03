import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TOPICS = [
  { id: 'newtons-laws', title: "Newton's Laws" },
  { id: 'kinematics', title: 'Kinematics' },
  { id: 'work-energy-theorem', title: 'Work-Energy Theorem' },
  { id: 'calculus', title: 'Calculus' },
  { id: 'electrostatics', title: 'Electrostatics' },
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("Seeding student mastery data...");
  const records = [];

  // Generate 20 students
  for (let i = 1; i <= 20; i++) {
    const userId = `student_${i}`;
    
    // Determine if this is one of the 5 struggling students
    const isStruggling = i <= 5; 

    for (const topic of TOPICS) {
      let verified_count = 0;
      let flagged_count = 0;

      if (isStruggling && (topic.id === 'kinematics' || topic.id === 'newtons-laws')) {
        // Struggling students have 0 correct, and lots of flagged errors on these topics
        verified_count = 0;
        flagged_count = randomInt(8, 15);
      } else {
        // Normal distribution for other students/topics
        verified_count = randomInt(5, 20);
        flagged_count = randomInt(0, 5);
      }

      records.push({
        user_id: userId,
        topic_id: topic.id,
        topic_title: topic.title,
        verified_count,
        flagged_count
      });
    }
  }

  // Insert records
  console.log(`Inserting ${records.length} records into user_topic_mastery...`);
  
  // We can just use the standard insert since these are new synthetic user_ids
  for (const record of records) {
    const { error } = await supabase.from('user_topic_mastery').upsert(record, { onConflict: 'user_id, topic_id' });
    if (error) {
      console.error(`Error inserting record for ${record.user_id} - ${record.topic_id}:`, error.message);
    }
  }

  console.log("Struggling Student data seeded successfully!");
}

main().catch(console.error);
