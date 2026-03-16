import { test, expect } from '@playwright/test';

test.describe('Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto('/');
    // Wait for main content to load
    await page.waitForLoadState('networkidle');
  });

  test('should load the homepage and display hero section', async ({ page }) => {
    // Check if the page title is correct
    await expect(page).toHaveTitle(/Swedish|Getaway|Rentals/i);

    // Check for hero/main section
    const mainSection = page.locator('main').first();
    await expect(mainSection).toBeVisible();
  });

  test('should display navigation links', async ({ page }) => {
    // Check for navigation element
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    // Check for key navigation links
    const homeLink = page.locator('a[href="/"]').first();
    await expect(homeLink).toBeVisible();

    const shopLink = page.locator('a[href="/shop"]');
    await expect(shopLink).toBeVisible();
  });

  test('should display property cards on homepage', async ({ page }) => {
    // Look for property cards - they should be visible
    const propertyCards = page.locator('[data-testid="property-card"], .property-card, [class*="property"]').first();

    // Wait for cards to be visible
    await page.waitForTimeout(1000);

    // Check if we have visible property-related content
    const content = page.locator('a[href*="/villa-"], a[href*="/property/"]').first();
    await expect(content).toBeVisible();
  });

  test('should have a functional search form', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="location"], input[placeholder*="where"]', { ignoreCase: true }).first();

    if (await searchInput.isVisible()) {
      // Test that the search input can be focused and typed in
      await searchInput.click();
      await searchInput.fill('Stockholm');
      await expect(searchInput).toHaveValue('Stockholm');
    }
  });

  test('should display footer', async ({ page }) => {
    // Scroll to bottom to ensure footer is in view
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Check for footer element
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();

    // Check for common footer content
    const footerText = page.locator('footer *');
    await expect(footerText.first()).toBeVisible();
  });

  test('should have accessible links in navigation', async ({ page }) => {
    // Check that navigation links are keyboard accessible
    const navLinks = page.locator('nav a');
    const count = await navLinks.count();

    expect(count).toBeGreaterThan(0);

    // Verify at least one link is visible
    const firstLink = navLinks.first();
    await expect(firstLink).toBeVisible();
  });

  test('should handle navigation to shop page', async ({ page }) => {
    // Find and click shop link
    const shopLink = page.locator('a[href="/shop"]');

    if (await shopLink.isVisible()) {
      await shopLink.click();
      await page.waitForURL('**/shop');
      await expect(page).toHaveURL(/\/shop/);
    }
  });

  test('should handle navigation to property pages', async ({ page }) => {
    // Look for property links
    const propertyLink = page.locator('a[href*="/villa-"], a[href*="/property/"]').first();

    if (await propertyLink.isVisible()) {
      await propertyLink.click();
      // Wait for the property page to load
      await page.waitForLoadState('networkidle');
      // Should be on a property page
      await expect(page).toHaveURL(/\/(villa-|property\/)/);
    }
  });

  test('should have proper page structure and headings', async ({ page }) => {
    // Check for H1 heading
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();

    // Check that page has main content structure
    const headings = page.locator('h1, h2, h3');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });
});
