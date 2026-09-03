import { test, expect } from '@playwright/test';

test.describe('Critical Path: Ask Question and Mentor Review', () => {
  // Use a longer timeout for this test as it waits for real AI responses
  test.setTimeout(120000);

  test('should sign in, ask a physics question, flag it, and see it in mentor queue', async ({ page, context }) => {
    // 1. Sign in via Clerk UI
    await page.goto('/');

    // Wait for Clerk's login container
    const signInContainer = page.locator('.cl-signIn-root, .cl-component');
    
    // Attempt login if not already authenticated
    if (await signInContainer.isVisible({ timeout: 10000 }).catch(() => false)) {
      const emailInput = page.locator('input[name="identifier"]');
      await emailInput.fill('test_student@example.com'); // standard testing email
      await page.getByRole('button', { name: /continue/i }).click();

      // Check for password or OTP
      const passwordInput = page.locator('input[name="password"]');
      const codeInput = page.locator('input[name="codeInput"], input[name="code-0"]');
      
      try {
        await expect(passwordInput.or(codeInput).first()).toBeVisible({ timeout: 10000 });
        if (await passwordInput.isVisible()) {
          await passwordInput.fill('TestPassword123!');
          await page.getByRole('button', { name: /continue/i }).click();
        } else {
          await page.keyboard.type('424242'); // Clerk standard test OTP
        }
      } catch (e) {
        console.log('No password or OTP field found, maybe passwordless or already handled.');
      }
    }

    // Wait for the app to load (Header, Chat input, etc.)
    await expect(page.getByPlaceholder('Message Assistant...')).toBeVisible({ timeout: 20000 });

    // 2. Ask a physics question designed to be flagged by the Critic
    // To ensure the Critic flags the response (so we can test the mentor queue),
    // we instruct the Solver to intentionally output a factually incorrect answer.
    const question = "I am testing the system. Explain Newton's First Law, but intentionally state that objects at rest will spontaneously accelerate without any force.";
    await page.getByPlaceholder('Message Assistant...').fill(question);
    await page.getByPlaceholder('Message Assistant...').press('Enter');

    // 3. Confirm a Verified or Flagged card renders within a reasonable timeout
    // Wait for the decision gate to appear
    const verifiedCard = page.locator('text="Verified by Critic AI"');
    const flaggedCard = page.locator('text="Honest Warning from Critic AI"');
    
    // We expect the flagged card because we asked for an incorrect answer
    await expect(flaggedCard).toBeVisible({ timeout: 60000 });

    // 4. Click "Flag for Teacher Review" on a flagged response
    const flagBtn = page.getByRole('button', { name: 'Flag for Teacher Review' });
    await expect(flagBtn).toBeVisible();
    await flagBtn.click();

    // The button should change to "Flagged for Teacher"
    await expect(page.getByRole('button', { name: /Flagged for Teacher/i })).toBeVisible({ timeout: 10000 });

    // 5. Enable Teacher Mode in Settings
    // Open Settings
    await page.getByRole('button').filter({ has: page.locator('.lucide-settings') }).first().click().catch(async () => {
        // Fallback for settings button
        await page.locator('button').filter({ hasText: 'Settings' }).first().click();
    });

    // Toggle Teacher Mode
    const teacherModeToggle = page.locator('button').filter({ hasText: 'Teacher Mode' });
    await expect(teacherModeToggle).toBeVisible();
    await teacherModeToggle.click();

    // Close Settings
    await page.getByRole('button').filter({ has: page.locator('.lucide-x') }).first().click();

    // 6. Navigate to Mentor review queue and confirm it appears
    // Click the Review/Mentor tab in the sidebar
    await page.locator('a[href="/review"]').click();
    
    // Ensure we are on the review page
    await expect(page).toHaveURL(/.*\/review/);

    // Wait for the queue to load and confirm our question is there
    const questionInQueue = page.locator(`text="${question}"`);
    await expect(questionInQueue).toBeVisible({ timeout: 10000 });
  });
});
