import { UnitOverview, SolverResult, VaultProblem, CohortMetric } from '../types';

export const MOCK_UNITS: UnitOverview[] = [
  {
    id: 'unit-4',
    name: 'Laws of Motion',
    course: 'NCERT Class 11 Physics • Chapter 5 (JEE/NEET Core)',
    overallMastery: 78,
    masteryDelta: 4,
    totalTimeHours: 14,
    totalTimeMinutes: 20,
    questionsCompleted: 156,
    questionsTotal: 200,
    topics: [
      {
        id: 'topic-1',
        unit: 'unit-4',
        title: "Newton's First & Second Laws",
        subtitle: 'Inertial frames & momentum rate p = mv',
        status: 'VERIFIED',
        auditDetails: 'All 3 laws verified against NCERT Class 11 Physics Pg 94-98.',
        masteryScore: 88,
      },
      {
        id: 'topic-2',
        unit: 'unit-4',
        title: 'Friction: Static vs Kinetic',
        subtitle: 'Upper limit f_s ≤ μ_s·N & stick-slip motion',
        status: 'FLAGGED',
        auditDetails:
          'Common misconception flagged: Static friction equals applied force until f_max, NOT always μ_s·N.',
        masteryScore: 62,
      },
      {
        id: 'topic-3',
        unit: 'unit-4',
        title: 'Circular Motion & Banking',
        subtitle: 'Centripetal force F_c = mv²/r & maximum safe speed',
        status: 'VERIFIED',
        auditDetails:
          'Level and banked road velocity constraints verified with NCERT Pg 104 citations.',
        masteryScore: 84,
      },
      {
        id: 'topic-4',
        unit: 'unit-4',
        title: 'Impulse & Conservation of Momentum',
        subtitle: 'Impulse J = ∫ F dt & rocket propulsion',
        status: 'VERIFIED',
        auditDetails: 'Momentum conservation verified for closed system recoil problems.',
        masteryScore: 91,
      },
    ],
  },
  {
    id: 'unit-7',
    name: 'System of Particles & Rotational Motion',
    course: 'NCERT Class 11 Physics • Chapter 7 (JEE Advanced)',
    overallMastery: 82,
    masteryDelta: 6,
    totalTimeHours: 18,
    totalTimeMinutes: 45,
    questionsCompleted: 180,
    questionsTotal: 220,
    topics: [
      {
        id: 'topic-5',
        unit: 'unit-7',
        title: 'Moment of Inertia',
        subtitle: 'Parallel & perpendicular axis theorems',
        status: 'VERIFIED',
        auditDetails: 'Integral mass element dm verified against NCERT Pg 165.',
        masteryScore: 94,
      },
      {
        id: 'topic-6',
        unit: 'unit-7',
        title: 'Torque & Angular Momentum',
        subtitle: 'Vector cross products τ = r × F',
        status: 'VERIFIED',
        auditDetails: 'Right-hand rule sign convention verified.',
        masteryScore: 86,
      },
    ],
  },
];

export const INITIAL_CHAT_SOLUTIONS: SolverResult[] = [
  {
    id: 'sol-1',
    query:
      'A car of mass 1500 kg drives at 20 m/s on a flat circular turn of radius 50 m with μ_s = 0.6. Will it skid? Show step-by-step NCERT derivation.',
    subject: 'JEE/NEET Physics • Laws of Motion (NCERT Ch 5)',
    title: 'Circular Motion Friction & Skidding Threshold Analysis',
    summary:
      'Derivation comparing required centripetal force F_c = mv²/r against maximum static friction f_max = μ_s·N.',
    steps: [
      {
        stepNumber: 1,
        title: 'Determine Required Centripetal Force (F_c)',
        description:
          'According to NCERT Class 11 Physics Section 5.10, the horizontal centripetal force needed for curved motion is F_c = m·v² / r.',
        verified: true,
        mathBlock: 'F_c = \\frac{1500 \\times 20^2}{50} = 12{,}000 \\text{ N}',
        criticFeedback: 'VERIFIED against NCERT Pg 104 Eq 5.18. Formula application is exact.',
      },
      {
        stepNumber: 2,
        title: 'Calculate Maximum Static Friction Available (f_max)',
        description:
          'Normal force N = m·g = 1500 × 9.8 = 14,700 N. Maximum static friction is f_max = μ_s · N.',
        verified: true,
        mathBlock: 'f_{\\text{max}} = 0.6 \\times 14{,}700 = 8{,}820 \\text{ N}',
        criticFeedback:
          'VERIFIED against NCERT Pg 101 Section 5.9. Normal reaction balance holds on level road.',
      },
      {
        stepNumber: 3,
        title: 'Compare Required Force vs Available Friction',
        description:
          'Since required centripetal force (12,000 N) exceeds available friction (8,820 N), the car cannot maintain the turn.',
        verified: true,
        mathBlock:
          'F_c (12{,}000\\text{ N}) > f_{\\text{max}} (8{,}820\\text{ N}) \\implies \\text{CAR WILL SKID!}',
        criticFeedback:
          'VERIFIED: Conclusion logically follows. Skidding condition verified for JEE Main.',
      },
    ],
    finalEquation:
      'v_{\\text{max}} = \\sqrt{\\mu_s g r} = \\sqrt{0.6 \\times 9.8 \\times 50} = 17.15 \\text{ m/s} \\quad (< 20\\text{ m/s} \\implies \\text{SKIDS})',
    citation: {
      textbook: 'NCERT Class 11 Physics Part 1',
      chapter: 'Chapter 5: Laws of Motion',
      notes: 'Motion of a car on a level circular road',
      ncertPage: 'Pg 104, Section 5.10.1',
    },
    timestamp: '2026-08-13T08:00:00Z',
    criticAuditStatus: 'VERIFIED',
    criticAuditNotes: '100% NCERT Verified. Every step supported by Class 11 NCERT Chapter 5 text.',
    isOutOfScope: false,
    pipelineLog: {
      solverDraftSummary: 'Solver drafted 3 steps using F_c = mv²/r and f_max = μ_s mg.',
      criticVerificationPassed: true,
      ncertSourceMatch: 'Matched NCERT Class 11 Physics Chapter 5, Pg 104 (Eq 5.18).',
      criticWarnings: [],
    },
  },
  {
    id: 'sol-2',
    query:
      'A block of 5 kg rests on a rough table with μ_s = 0.4. A horizontal force of 10 N is applied. Is static friction equal to 0.4 × 5 × 9.8 = 19.6 N?',
    subject: 'JEE/NEET Physics • Common Misconception Trap',
    title: 'Static Friction Trap: Self-Adjusting Force Reality',
    summary:
      'Critic AI flagged a common AI hallucination / student misconception trap regarding static friction magnitude.',
    steps: [
      {
        stepNumber: 1,
        title: 'Calculate Maximum Static Friction Limit (f_max)',
        description:
          'The MAXIMUM possible static friction is f_max = μ_s · N = 0.4 × 5 × 9.8 = 19.6 N.',
        verified: true,
        mathBlock: 'f_{\\text{max}} = \\mu_s N = 19.6 \\text{ N}',
        criticFeedback: 'VERIFIED: Correct calculation of upper threshold.',
      },
      {
        stepNumber: 2,
        title: 'Evaluate Actual Static Friction Force (f_s)',
        description:
          'Static friction is a SELF-ADJUSTING FORCE! It only opposes applied force up to f_max. Since applied force F = 10 N < f_max (19.6 N), static friction f_s is EXACTLY 10 N, NOT 19.6 N!',
        verified: false,
        mathBlock: 'f_s = F_{\\text{applied}} = 10 \\text{ N} \\quad (\\neq 19.6 \\text{ N})',
        criticFeedback:
          'CRITIC ALERT: High hallucination trap rate in standard AIs! Many AIs mistakenly state friction is 19.6 N, which would accelerate the block backwards!',
      },
    ],
    finalEquation:
      'f_s = 10 \\text{ N} \\quad (\\text{Block remains stationary, static friction matches applied force})',
    citation: {
      textbook: 'NCERT Class 11 Physics Part 1',
      chapter: 'Chapter 5: Laws of Motion',
      notes: 'Static friction self-adjusting nature',
      ncertPage: 'Pg 101, Section 5.9',
    },
    timestamp: '2026-08-13T07:30:00Z',
    criticAuditStatus: 'FLAGGED',
    criticAuditNotes:
      'HONEST WARNING: Common JEE Misconception Trap! Standard AI chatbots often hallucinate f_s = 19.6 N. Static friction self-adjusts to 10 N. Do not memorize naive μ_s·N formulas for stationary objects!',
    isOutOfScope: true,
    pipelineLog: {
      solverDraftSummary: 'Naive AI initially assumed friction is always μ_s·N (19.6 N).',
      criticVerificationPassed: false,
      ncertSourceMatch:
        'NCERT Class 11 Pg 101 explicitly warns: "Static friction opposes impending motion up to f_s ≤ f_max".',
      criticWarnings: [
        'Detected AI Hallucination Trap: f_s = 19.6 N implies backward acceleration without external cause!',
        'Critic AI corrected answer to f_s = 10 N.',
      ],
    },
  },
];

export const MOCK_VAULT_PROBLEMS: VaultProblem[] = [
  {
    id: 'problem-402',
    problemNumber: 'Problem #402',
    category: 'JEE Physics > Laws of Motion',
    title: 'Circular Motion & Skidding Friction Analysis',
    question:
      'A car of mass 1500 kg is moving with a constant speed of 20 m/s on a circular track of radius 50 m. Determine the centripetal force required to keep the car on the track. If the coefficient of static friction between the tires and the road is 0.6, will the car skid?',
    reference: {
      textbook: 'NCERT Class 11 Physics',
      chapter: 'Chapter 5: Laws of Motion',
      page: 'Pg 104',
    },
    factCheck:
      'Centripetal force on a level road is provided purely by static friction: f_s = m v² / r. The maximum speed before skidding depends only on v_max = √(μ_s r g) and is independent of mass m.',
    solution: INITIAL_CHAT_SOLUTIONS[0],
    params: {
      mass: 1500,
      velocity: 20,
      radius: 50,
      mu: 0.6,
    },
  },
  {
    id: 'problem-403',
    problemNumber: 'Problem #403',
    category: 'JEE Physics > Laws of Motion',
    title: 'Banked Road Safe Speed Derivation',
    question:
      'A highway curve of radius 120 m is banked at an angle of 15°. Calculate the safe speed at which a car can navigate the curve without relying on friction.',
    reference: {
      textbook: 'NCERT Class 11 Physics',
      chapter: 'Chapter 5: Laws of Motion',
      page: 'Pg 105',
    },
    factCheck:
      'For a banked curve without relying on friction, the horizontal component of the normal force provides the centripetal force: N sin θ = m v² / r, and N cos θ = mg. Thus, v = √(rg tan θ).',
    solution: {
      id: 'sol-403',
      query: 'Banked curve optimal speed without friction',
      subject: 'JEE Physics • Laws of Motion',
      title: 'Optimum Banking Speed Derivation v = √(rg tan θ)',
      summary:
        'Derivation of banking velocity where horizontal component of normal reaction provides centripetal force.',
      steps: [
        {
          stepNumber: 1,
          title: 'Balance Vertical & Horizontal Components',
          description: 'N cos(θ) = mg and N sin(θ) = m v² / r.',
          verified: true,
          mathBlock: '\\tan(\\theta) = \\frac{v^2}{r g}',
          criticFeedback: 'VERIFIED against NCERT Class 11 Pg 105 Eq 5.21.',
        },
        {
          stepNumber: 2,
          title: 'Calculate Optimum Velocity v_0',
          description: 'v_0 = √(120 × 9.8 × tan 15°) ≈ 17.74 m/s (63.8 km/h).',
          verified: true,
          mathBlock: 'v_0 = \\sqrt{120 \\times 9.8 \\times 0.2679} = 17.74 \\text{ m/s}',
          criticFeedback: 'VERIFIED: Standard JEE Main result.',
        },
      ],
      finalEquation: 'v_0 = \\sqrt{r g \\tan \\theta} = 17.74 \\text{ m/s}',
      citation: {
        textbook: 'NCERT Class 11 Physics',
        chapter: 'Chapter 5: Laws of Motion',
        notes: 'Motion of a car on a banked road',
        ncertPage: 'Pg 105, Section 5.10.2',
      },
      timestamp: '2026-08-12T14:20:00Z',
      criticAuditStatus: 'VERIFIED',
      criticAuditNotes: '100% NCERT Verified.',
    },
    params: {
      mass: 1200,
      velocity: 17.74,
      radius: 120,
      mu: 0.0,
    },
  },
];

export const MOCK_COHORTS: CohortMetric[] = [
  { cohortId: 'JEE-2025-A', meanScore: 84.2, variance: 12.4, participation: 98 },
  { cohortId: 'NEET-2025-B', meanScore: 79.8, variance: 15.1, participation: 92 },
  { cohortId: 'JEE-2026-C', meanScore: 88.5, variance: 9.2, participation: 100 },
];
