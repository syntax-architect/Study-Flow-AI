import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { pipeline } from '@huggingface/transformers';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const problems = [
  {
    content: "A block of mass 5 kg rests on a rough horizontal surface with a coefficient of static friction of 0.4. What is the minimum horizontal force required to move the block? (Take g = 10 m/s^2)",
    metadata: {
      subject: "Physics",
      chapter: "Laws of Motion",
      topic: "Friction",
      difficulty: "Medium",
      answer: "The normal force N = mg = 5 * 10 = 50 N. The maximum static friction force is f_s = mu_s * N = 0.4 * 50 = 20 N. Therefore, a minimum horizontal force of 20 N is required."
    }
  },
  {
    content: "A car accelerates uniformly from rest to a speed of 20 m/s in 10 seconds. Find the distance covered by the car during this time.",
    metadata: {
      subject: "Physics",
      chapter: "Kinematics",
      topic: "Equations of Motion",
      difficulty: "Easy",
      answer: "Using v = u + at, we find acceleration a = (20 - 0) / 10 = 2 m/s^2. Using s = ut + 0.5 * a * t^2, the distance is s = 0 + 0.5 * 2 * 10^2 = 100 meters."
    }
  },
  {
    content: "Find the derivative of f(x) = x^2 * sin(x) with respect to x.",
    metadata: {
      subject: "Mathematics",
      chapter: "Calculus",
      topic: "Product Rule",
      difficulty: "Medium",
      answer: "Using the product rule d(uv)/dx = u'v + uv', let u = x^2 and v = sin(x). Then u' = 2x and v' = cos(x). f'(x) = 2x * sin(x) + x^2 * cos(x)."
    }
  },
  {
    content: "A particle performs Simple Harmonic Motion (SHM) with an amplitude of 5 cm and a time period of 2 seconds. Find the maximum velocity of the particle.",
    metadata: {
      subject: "Physics",
      chapter: "Oscillations",
      topic: "Simple Harmonic Motion",
      difficulty: "Medium",
      answer: "The angular frequency is omega = 2 * pi / T = 2 * pi / 2 = pi rad/s. The maximum velocity is v_max = A * omega = 5 * pi cm/s (or approximately 15.7 cm/s)."
    }
  },
  {
    content: "Integrate the function f(x) = 1 / (1 + x^2) from x = 0 to x = 1.",
    metadata: {
      subject: "Mathematics",
      chapter: "Calculus",
      topic: "Definite Integrals",
      difficulty: "Easy",
      answer: "The integral of 1 / (1 + x^2) is arctan(x). Evaluating from 0 to 1 gives arctan(1) - arctan(0) = pi/4 - 0 = pi/4."
    }
  },
  {
    content: "Two point charges, +4 microcoulombs and -2 microcoulombs, are placed 10 cm apart in a vacuum. Calculate the electrostatic force between them.",
    metadata: {
      subject: "Physics",
      chapter: "Electrostatics",
      topic: "Coulomb's Law",
      difficulty: "Medium",
      answer: "Using Coulomb's law F = k * |q1 * q2| / r^2. F = (9 * 10^9) * (4 * 10^-6) * (2 * 10^-6) / (0.1)^2 = 72 * 10^-3 / 0.01 = 7.2 N. The force is attractive."
    }
  },
  {
    content: "If the sum of the first n terms of an Arithmetic Progression is given by S_n = 3n^2 + 5n, find the nth term of the AP.",
    metadata: {
      subject: "Mathematics",
      chapter: "Algebra",
      topic: "Arithmetic Progression",
      difficulty: "Medium",
      answer: "The nth term a_n is S_n - S_{n-1}. a_n = (3n^2 + 5n) - [3(n-1)^2 + 5(n-1)] = 3n^2 + 5n - [3(n^2 - 2n + 1) + 5n - 5] = 3n^2 + 5n - (3n^2 - 6n + 3 + 5n - 5) = 6n + 2."
    }
  },
  {
    content: "A light ray travels from air (refractive index = 1) into glass (refractive index = 1.5) at an angle of incidence of 45 degrees. Find the angle of refraction.",
    metadata: {
      subject: "Physics",
      chapter: "Optics",
      topic: "Snell's Law",
      difficulty: "Easy",
      answer: "Using Snell's Law: n1 * sin(theta1) = n2 * sin(theta2). 1 * sin(45) = 1.5 * sin(theta2). sin(theta2) = (1 / sqrt(2)) / 1.5 = 0.471. theta2 = arcsin(0.471) which is approx 28.1 degrees."
    }
  }
];

async function main() {
  console.log("Loading embedding model (all-MiniLM-L6-v2)...");
  
  // Note: Using Xenova's onnx-converted model which runs perfectly in Node via transformers.js
  const generateEmbedding = await pipeline(
    'feature-extraction', 
    'Xenova/all-MiniLM-L6-v2',
    { dtype: 'fp32' } // Ensure precision matches typical vector DB requirements
  );

  console.log(`Model loaded. Processing ${problems.length} problems...`);

  for (let i = 0; i < problems.length; i++) {
    const problem = problems[i];
    console.log(`[${i+1}/${problems.length}] Generating embedding for: "${problem.content.substring(0, 40)}..."`);
    
    // Create the embedding for the content + the answer to improve semantic search hits
    const textToEmbed = `Question: ${problem.content}\nAnswer: ${problem.metadata.answer}`;
    
    const output = await generateEmbedding(textToEmbed, {
      pooling: 'mean',
      normalize: true,
    });
    
    // Convert Tensor to standard JS array
    const embeddingArray = Array.from(output.data);

    // Insert into Supabase
    const { error } = await supabase
      .from('documents')
      .insert({
        content: textToEmbed,
        metadata: problem.metadata,
        embedding: embeddingArray
      });

    if (error) {
      console.error(`Failed to insert problem ${i+1}:`, error.message);
    } else {
      console.log(`  -> Successfully saved to vault.`);
    }
  }

  console.log("Vault seeding complete! Your Synthetic RAG data is ready.");
}

main().catch(console.error);
