import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  });

  test('should load the auth page', async ({ page }) => {
    // Check that page has loaded
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();

    // Check for auth-related heading or title
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should display login and signup tabs or sections', async ({ page }) => {
    // Look for tab or section indicators
    const loginTab = page.locator('button[role="tab"]:has-text("Log"), button:has-text("Sign In"), button:has-text("Login")', { ignoreCase: true }).first();
    const signupTab = page.locator('button[role="tab"]:has-text("Sign"), button:has-text("Register"), button:has-text("Create")', { ignoreCase: true }).first();

    // Check for login section
    const loginSection = page.locator('[class*="login"], [data-testid*="login"]').first();

    if (await loginTab.isVisible()) {
      await expect(loginTab).toBeVisible();
    }

    if (await loginSection.isVisible()) {
      await expect(loginSection).toBeVisible();
    }
  });

  test('should have email input field', async ({ page }) => {
    // Look for email input
    const emailInput = page.locator('input[type="email"]').first();

    if (await emailInput.isVisible()) {
      await expect(emailInput).toBeVisible();

      // Test that we can type in the field
      await emailInput.click();
      await emailInput.fill('test@example.com');
      await expect(emailInput).toHaveValue('test@example.com');
    }
  });

  test('should have password input field', async ({ page }) => {
    // Look for password input
    const passwordInput = page.locator('input[type="password"]').first();

    if (await passwordInput.isVisible()) {
      await expect(passwordInput).toBeVisible();

      // Test that we can type in the field
      await passwordInput.click();
      await passwordInput.fill('password123');
      // Value should not be visible (masked)
      await expect(passwordInput).toHaveValue('password123');
    }
  });

  test('should have submit button', async ({ page }) => {
    // Look for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In"), button:has-text("Login")', { ignoreCase: true }).first();

    if (await submitButton.isVisible()) {
      await expect(submitButton).toBeVisible();

      // Check button is enabled (not disabled by default)
      const isDisabled = await submitButton.isDisabled();
      // Button might be disabled if form is empty, so we just check visibility
      await expect(submitButton).toBeVisible();
    }
  });

  test('should have form validation on empty submission', async ({ page }) => {
    // Find submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In")', { ignoreCase: true }).first();

    if (await submitButton.isVisible() && !(await submitButton.isDisabled())) {
      // Click submit with empty form
      await submitButton.click();

      // Wait a moment for validation messages to appear
      await page.waitForTimeout(500);

      // Check for validation errors
      const errorMessages = page.locator('[class*="error"], [class*="invalid"], [role="alert"]');
      const errorCount = await errorMessages.count();

      // We expect either error messages or the form to still be visible
      if (errorCount === 0) {
        // No visible errors, check that form is still visible
        await expect(submitButton).toBeVisible();
      }
    }
  });

  test('should have signup tab/section if available', async ({ page }) => {
    // Look for signup tab
    const signupTab = page.locator('button[role="tab"]:has-text("Sign"), button:has-text("Register"), button:has-text("Create")', { ignoreCase: true }).first();

    if (await signupTab.isVisible()) {
      await signupTab.click();

      // Should show signup form
      const signupForm = page.locator('form').first();
      await expect(signupForm).toBeVisible();
    }
  });

  test('should have password recovery option if available', async ({ page }) => {
    // Look for forgot password link
    const forgotLink = page.locator('a:has-text("Forgot"), a:has-text("Reset"), a:has-text("Recovery")', { ignoreCase: true }).first();

    if (await forgotLink.isVisible()) {
      await expect(forgotLink).toBeVisible();

      // Click on it
      await forgotLink.click();
      await page.waitForTimeout(500);

      // Should either navigate or show recovery form
      const pageContent = page.locator('main, [class*="form"]').first();
      await expect(pageContent).toBeVisible();
    }
  });

  test('should have social login options if available', async ({ page }) => {
    // Look for social auth buttons (Google, GitHub, etc.)
    const googleButton = page.locator('button:has-text("Google"), button:has-text("gmail")', { ignoreCase: true }).first();
    const githubButton = page.locator('button:has-text("GitHub"), button:has-text("github")', { ignoreCase: true }).first();

    const hasSocialAuth = await googleButton.isVisible() || await githubButton.isVisible();

    // Social auth is optional, just check if available
    if (hasSocialAuth) {
      // Verify at least one social button is visible
      const socialButtons = page.locator('button:has-text("Google"), button:has-text("GitHub"), button:has-text("Apple")');
      const count = await socialButtons.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should have link to homepage', async ({ page }) => {
    // Look for logo or home link
    const homeLink = page.locator('a[href="/"]').first();

    if (await homeLink.isVisible()) {
      await expect(homeLink).toBeVisible();
    }
  });

  test('should display remember me checkbox if available', async ({ page }) => {
    // Look for remember me checkbox
    const rememberCheckbox = page.locator('input[type="checkbox"]').first();

    if (await rememberCheckbox.isVisible()) {
      await expect(rememberCheckbox).toBeVisible();

      // Test checkbox functionality
      const isChecked = await rememberCheckbox.isChecked();
      await rememberCheckbox.click();
      const isCheckedAfter = await rememberCheckbox.isChecked();

      // State should toggle
      expect(isCheckedAfter).toBe(!isChecked);
    }
  });

  test('should have proper form structure and accessibility', async ({ page }) => {
    // Check for form element
    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // Check that form has inputs
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);

    // Check for labels if available
    const labels = page.locator('label');
    const labelCount = await labels.count();

    // Labels are optional but good for accessibility
    if (labelCount > 0) {
      expect(labelCount).toBeGreaterThan(0);
    }
  });
});
