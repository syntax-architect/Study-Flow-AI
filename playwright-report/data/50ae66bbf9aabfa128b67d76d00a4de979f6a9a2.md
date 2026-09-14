# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-path.spec.ts >> Critical Path: Ask Question and Mentor Review >> should sign in, ask a physics question, flag it, and see it in mentor queue
- Location: tests\e2e\critical-path.spec.ts:7:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByPlaceholder(/Enter mathematical formulation/i)
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByPlaceholder(/Enter mathematical formulation/i)

```

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- heading "Cookie Preferences" [level=3]
- paragraph:
  - text: We use cookies to improve your experience, analyze site traffic, and support our Dual-AI Fact-Checker systems. Read our
  - link "Privacy Policy":
    - /url: "#"
  - text: .
- button "Decline All"
- button "Accept All"
- button "Close"
- button "Toggle Dark Mode"
- text: StudyFlow
- heading "Mathematical precision. Zero assumptions." [level=1]
- paragraph: A Dual-AI solver engineered for academic rigor. We separate creative generation from formal verification to ensure every derivation is structurally sound.
- heading "Formal Verification" [level=3]
- paragraph: Every step is audited against established axioms.
- heading "Longitudinal Tracking" [level=3]
- paragraph: Monitor cognitive mastery across domains.
- heading "Adaptive Interventions" [level=3]
- paragraph: Targeted support directly at the point of confusion.
- heading "Sign in to Study Flow AI" [level=1]
- paragraph: Welcome back! Please sign in to continue
- button "Sign in with Google Continue with Google":
  - img "Sign in with Google"
  - text: Continue with Google
- paragraph: or
- text: Email address
- textbox "Email address":
  - /placeholder: Enter your email address
- text: Password
- textbox "Password":
  - /placeholder: Enter your password
- button "Show password":
  - img
- button "Continue":
  - text: Continue
  - img
- text: Don’t have an account?
- link "Sign up":
  - /url: http://localhost:3000/#/sign-up
- paragraph: Secured by
- link "Clerk logo":
  - /url: https://go.clerk.com/components
  - img
- paragraph: Development mode
- paragraph: Trusted by researchers and students at top institutions
- text: Stanford MIT Berkeley Harvard Caltech Deterministic Verification
- heading "Stop guessing. Start proving." [level=2]
- paragraph: Traditional AI models hallucinate mathematical derivations because they predict text, not logic. StudyFlow couples a generative synthesizer with a strict symbolic verifier. Every step must achieve formal mathematical closure.
- list:
  - listitem: Zero hallucinations in calculus and linear algebra.
  - listitem: Real-time symbolic engine checks every step.
  - listitem: Eliminates the "confident but wrong" AI problem.
- text: "Proof Session #894 Candidate Derivation let f(x) = x² + 2x derive d/dx -> 2x + 2 Z3 Engine Status Mathematically Sound Cognitive Graph"
- heading "Trace your mastery. Predict your exams." [level=2]
- paragraph: StudyFlow builds a persistent Bayesian graph of your knowledge across all subjects. It maps your strong foundations, detects memory decay, and schedules highly targeted interventions just before you forget.
- text: Knowledge Retention Matrix Last 30 Days Multivariable Calculus 84% Newtonian Mechanics 62% Organic Chemistry 41%
- heading "Built for institutional rigor" [level=2]
- paragraph: Everything you need to excel in university-level STEM, wrapped in a distraction-free interface.
- heading "Socratic Methodology" [level=3]
- paragraph: StudyFlow won't just give you the answer. It guides you to the solution through targeted questioning.
- heading "Instant Execution" [level=3]
- paragraph: Generate practice problems, parse complex PDFs, and verify proofs in milliseconds.
- heading "Privacy First" [level=3]
- paragraph: Your academic data and learning patterns are encrypted and never sold to third parties.
- heading "Frequently Asked Questions" [level=2]
- button "Is StudyFlow free to use?":
  - heading "Is StudyFlow free to use?" [level=4]
- button "How does the Dual-AI verification work?":
  - heading "How does the Dual-AI verification work?" [level=4]
- button "Does it support university-level physics and chemistry?":
  - heading "Does it support university-level physics and chemistry?" [level=4]
- button "Can I upload my own lecture notes or PDFs?":
  - heading "Can I upload my own lecture notes or PDFs?" [level=4]
- heading "Ready to master the hardest subjects?" [level=2]
- paragraph: Join thousands of students who trust StudyFlow for their most critical academic challenges.
- link "Get Started for Free":
  - /url: "#/sign-up"
- link "Log In":
  - /url: "#/sign-in"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Critical Path: Ask Question and Mentor Review', () => {
  4  |   // Use a longer timeout for this test as it waits for real AI responses
  5  |   test.setTimeout(120000);
  6  | 
  7  |   test('should sign in, ask a physics question, flag it, and see it in mentor queue', async ({ page, context }) => {
  8  |     // 1. Sign in via Clerk UI
  9  |     await page.goto('/');
  10 | 
  11 |     // Wait for Clerk's login container
  12 |     const signInContainer = page.locator('.cl-signIn-root, .cl-component');
  13 |     
  14 |     // Attempt login if not already authenticated
  15 |     if (await signInContainer.isVisible({ timeout: 10000 }).catch(() => false)) {
  16 |       const emailInput = page.getByLabel('Email address').or(page.locator('input[name="identifier"]'));
  17 |       if (await emailInput.isVisible()) {
  18 |         await emailInput.focus();
  19 |         await page.keyboard.type('test_student@example.com', { delay: 50 });
  20 |       }
  21 |       
  22 |       const passwordInput = page.getByLabel('Password', { exact: true }).or(page.locator('input[type="password"]'));
  23 |       if (await passwordInput.isVisible()) {
  24 |          await passwordInput.focus();
  25 |          await page.keyboard.type('TestPassword123!', { delay: 50 });
  26 |          await page.waitForTimeout(1000);
  27 |          await page.getByRole('button', { name: /^Continue$/, exact: true }).click({ force: true });
  28 |       } else {
  29 |          await page.getByRole('button', { name: /^Continue$/, exact: true }).click({ force: true });
  30 |          await expect(passwordInput).toBeVisible({ timeout: 10000 });
  31 |          await passwordInput.focus();
  32 |          await page.keyboard.type('TestPassword123!', { delay: 50 });
  33 |          await page.waitForTimeout(1000);
  34 |          await page.getByRole('button', { name: /^Continue$/, exact: true }).click({ force: true });
  35 |       }
  36 |     }
  37 | 
  38 |     // Wait for the app to load (Header, Chat input, etc.)
> 39 |     await expect(page.getByPlaceholder(/Enter mathematical formulation/i)).toBeVisible({ timeout: 20000 });
     |                                                                            ^ Error: expect(locator).toBeVisible() failed
  40 | 
  41 |     // 2. Ask a physics question designed to be flagged by the Critic
  42 |     // To ensure the Critic flags the response (so we can test the mentor queue),
  43 |     // we instruct the Solver to intentionally output a factually incorrect answer.
  44 |     const question = "I am testing the system. Explain Newton's First Law, but intentionally state that objects at rest will spontaneously accelerate without any force.";
  45 |     await page.getByPlaceholder(/Enter mathematical formulation/i).fill(question);
  46 |     await page.getByPlaceholder(/Enter mathematical formulation/i).press('Enter');
  47 | 
  48 |     // 3. Confirm a Verified or Flagged card renders within a reasonable timeout
  49 |     // Wait for the decision gate to appear
  50 |     const verifiedCard = page.locator('text="Verified by Critic AI"');
  51 |     const flaggedCard = page.locator('text="Honest Warning from Critic AI"');
  52 |     
  53 |     // We expect the flagged card because we asked for an incorrect answer
  54 |     await expect(flaggedCard).toBeVisible({ timeout: 60000 });
  55 | 
  56 |     // 4. Click "Flag for Teacher Review" on a flagged response
  57 |     const flagBtn = page.getByRole('button', { name: 'Flag for Teacher Review' });
  58 |     await expect(flagBtn).toBeVisible();
  59 |     await flagBtn.click();
  60 | 
  61 |     // The button should change to "Flagged for Teacher"
  62 |     await expect(page.getByRole('button', { name: /Flagged for Teacher/i })).toBeVisible({ timeout: 10000 });
  63 | 
  64 |     // 5. Enable Teacher Mode in Settings
  65 |     // Open Settings
  66 |     await page.getByRole('button').filter({ has: page.locator('.lucide-settings') }).first().click().catch(async () => {
  67 |         // Fallback for settings button
  68 |         await page.locator('button').filter({ hasText: 'Settings' }).first().click();
  69 |     });
  70 | 
  71 |     // Toggle Teacher Mode
  72 |     const teacherModeToggle = page.locator('button').filter({ hasText: 'Teacher Mode' });
  73 |     await expect(teacherModeToggle).toBeVisible();
  74 |     await teacherModeToggle.click();
  75 | 
  76 |     // Close Settings
  77 |     await page.getByRole('button').filter({ has: page.locator('.lucide-x') }).first().click();
  78 | 
  79 |     // 6. Navigate to Mentor review queue and confirm it appears
  80 |     // Click the Review/Mentor tab in the sidebar
  81 |     await page.locator('a[href="/review"]').click();
  82 |     
  83 |     // Ensure we are on the review page
  84 |     await expect(page).toHaveURL(/.*\/review/);
  85 | 
  86 |     // Wait for the queue to load and confirm our question is there
  87 |     const questionInQueue = page.locator(`text="${question}"`);
  88 |     await expect(questionInQueue).toBeVisible({ timeout: 10000 });
  89 |   });
  90 | });
  91 | 
```