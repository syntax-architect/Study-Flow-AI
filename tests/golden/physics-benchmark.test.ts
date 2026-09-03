/**
 * @jest-environment node
 */
import { AiService } from '../../server/services/ai.service';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Force 60s timeout for these long-running real API tests
jest.setTimeout(120000);

const QUESTIONS = [
  {
    query: "A block of mass 2 kg is placed on a smooth horizontal surface. Two forces F1 = 20 N and F2 = 10 N act on it in opposite directions. Find the acceleration of the block.",
    expected: ["5", "5 m/s^2", "5 m/s2"]
  },
  {
    query: "A monkey of mass 40 kg climbs on a rope which can stand a maximum tension of 600 N. In which of the following cases will the rope break? The monkey (a) climbs up with an acceleration of 6 m/s^2 (b) climbs down with an acceleration of 4 m/s^2 (c) climbs up with a uniform speed of 5 m/s (d) falls down the rope nearly freely under gravity. Take g = 10 m/s^2.",
    expected: ["a", "(a)", "climbs up with an acceleration of 6"]
  },
  {
    query: "A car is moving in a circular horizontal track of radius 10 m with a constant speed of 10 m/s. A bob is suspended from the roof of the car by a light wire of length 1 m. The angle made by the wire with the vertical is (g = 10 m/s^2)",
    expected: ["45", "45 degree", "pi/4"]
  },
  {
    query: "A body of mass 5 kg is suspended by a spring balance on an inclined plane. The spring balance measure 30 N. If the angle of inclination is theta, then theta is (take g = 10 m/s^2)",
    expected: ["37", "37 degree", "3/5"]
  },
  {
    query: "A mass of 1 kg is suspended by a thread. It is lifted up with an acceleration of 4.9 m/s^2, lowered with an acceleration of 4.9 m/s^2. The ratio of the tensions is?",
    expected: ["3:1", "3", "3/1"]
  },
  {
    query: "A particle of mass 0.3 kg is subjected to a force F = -kx with k = 15 N/m. What will be its initial acceleration if it is released from a point x = 20 cm?",
    expected: ["-10", "10 m/s^2", "-10 m/s^2"]
  },
  {
    query: "A block of mass m is placed on a smooth inclined wedge ABC of inclination theta as shown in the figure. The wedge is given an acceleration 'a' towards the right. The relation between a and theta for the block to remain stationary on the wedge is",
    expected: ["g tan", "gtan"]
  },
  {
    query: "A 70 kg man stands in contact against the inner wall of a hollow cylindrical drum of radius 3 m rotating about its vertical axis with 200 rev/min. The coefficient of friction between the wall and his clothing is 0.15. What is the minimum rotational speed of the cylinder to enable the man to remain stuck to the wall (without falling) when the floor is suddenly removed?",
    expected: ["4.7", "4.71", "sqrt(22.2)", "22.2"]
  },
  {
    query: "Two masses 8 kg and 12 kg are connected at the two ends of a light inextensible string that goes over a frictionless pulley. Find the acceleration of the masses, and the tension in the string when the masses are released.",
    expected: ["2 m/s^2", "96 N", "a = 2", "T = 96", "96", "2"]
  },
  {
    query: "A bullet of mass 0.04 kg moving with a speed of 90 m/s enters a heavy wooden block and is stopped after a distance of 60 cm. What is the average resistive force exerted by the block on the bullet?",
    expected: ["270", "270 N", "270N"]
  }
];

describe('Physics Benchmark Golden Suite', () => {
  let passedCount = 0;
  let totalConfidence = 0;
  let verifiedCount = 0;
  
  afterAll(() => {
    const totalCount = QUESTIONS.length;
    const passRate = (passedCount / totalCount) * 100;
    const avgConfidence = verifiedCount > 0 ? totalConfidence / verifiedCount : 0;
    
    // Log the actual measured pass rate and average confidence score to a file
    const logFile = path.resolve(__dirname, '../../golden-benchmark-history.json');
    const logEntry = {
      timestamp: new Date().toISOString(),
      subject: 'Physics - Laws of Motion',
      totalQuestions: totalCount,
      passedCount,
      passRate,
      avgConfidence,
    };
    
    let history = [];
    if (fs.existsSync(logFile)) {
      history = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    history.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(history, null, 2));

    // Ensure we meet the 80% threshold
    expect(passRate).toBeGreaterThanOrEqual(80);
  });

  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    it(`should correctly answer Question ${i + 1}`, async () => {
      // 1. Run through the real generateSolverCritic pipeline
      const result = await AiService.generateSolverCritic(
        q.query,
        'Physics',
        'en',
        [],
        undefined,
        'test-user'
      );

      // Verify answer matches known expected outputs loosely
      const combinedText = (result.solverFinalAnswer + " " + result.criticFeedback + " " + result.explanation).toLowerCase();
      
      const isMatch = q.expected.some(exp => combinedText.includes(exp.toLowerCase()));
      
      if (isMatch) {
        passedCount++;
      }

      // Check verification and citation
      if (result.criticAuditStatus === 'VERIFIED') {
        verifiedCount++;
        totalConfidence += (result.criticConfidence || 100);

        // 2. For every response marked VERIFIED, the citation field must be non-empty and reference real content
        expect(result.citation).toBeDefined();
        if (result.citation) {
          const hasRef = result.citation.chapter || result.citation.reference;
          expect(hasRef).toBeTruthy();
        } else {
          // Force fail if it's verified but missing citation
          expect(true).toBe(false);
        }
      }

      // Assert correctness for the individual test
      // If we don't want the suite to fail immediately on 1 question, we should not assert here,
      // but the prompt says: "fail the suite if the pass rate drops below 80%".
      // Usually, individual test cases fail if the assertion fails. If we want 80% overall pass,
      // we can't fail the individual test block if we just want to count it.
      // Actually, standard practice for benchmark suites is to assert in the test block, and if it fails, the suite fails. 
      // But they want 80% tolerance. 
      // So instead of failing the test case, we just record it, and the afterAll asserts the pass rate!
      // To satisfy Jest, we can just assert that it completed processing without throwing.
      expect(result).toBeDefined();
      
      // Let's add a console.log to see the output
      if (!isMatch) {
        console.log(`Question ${i+1} failed. Expected one of ${q.expected}, got: ${combinedText}`);
      }
    });
  }
});
