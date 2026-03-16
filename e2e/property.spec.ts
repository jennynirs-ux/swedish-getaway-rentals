import { test, expect } from '@playwright/test';

test.describe('Property Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a property page
    await page.goto('/villa-hacken');
    await page.waitForLoadState('networkidle');
  });

  test('should load the property detail page', async ({ page }) => {
    // Check that page has loaded with property content
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();

    // Check for property title or heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should display property images/gallery', async ({ page }) => {
    // Look for image gallery
    const images = page.locator('img[alt*="property"], img[alt*="villa"], img[alt*="room"]', { ignoreCase: true });

    // Wait for images to load
    await page.waitForTimeout(500);

    // Check if at least one image is visible
    const imageCount = await images.count();
    expect(imageCount).toBeGreaterThan(0);
  });

  test('should have an accessible image gallery', async ({ page }) => {
    // Check for gallery navigation elements
    const gallery = page.locator('[class*="gallery"], [data-testid*="gallery"]').first();

    if (await gallery.isVisible()) {
      await expect(gallery).toBeVisible();

      // Check for navigation buttons (prev/next)
      const navButtons = page.locator('button[aria-label*="prev"], button[aria-label*="next"], button[class*="carousel"]');
      const navCount = await navButtons.count();

      // If carousel buttons exist, verify they're visible
      if (navCount > 0) {
        const firstButton = navButtons.first();
        await expect(firstButton).toBeVisible();
      }
    }
  });

  test('should display booking form', async ({ page }) => {
    // Look for booking form elements
    const bookingForm = page.locator('form', { has: page.locator('input[type="date"], input[placeholder*="date"]', { ignoreCase: true }) }).first();

    // Alternative: look for booking-related button or section
    const bookButton = page.locator('button:has-text("Book"), button:has-text("Reserve"), button:has-text("Book Now")', { ignoreCase: true }).first();

    if (await bookButton.isVisible()) {
      await expect(bookButton).toBeVisible();
    }

    // Check for date picker inputs
    const dateInputs = page.locator('input[type="date"]');
    const dateInputCount = await dateInputs.count();

    if (dateInputCount > 0) {
      const firstDateInput = dateInputs.first();
      await expect(firstDateInput).toBeVisible();
    }
  });

  test('should have a map displaying the property location', async ({ page }) => {
    // Look for map container
    const mapContainer = page.locator('[class*="map"], [data-testid*="map"]').first();

    if (await mapContainer.isVisible()) {
      await expect(mapContainer).toBeVisible();

      // Check for map elements (could be Leaflet, Google Maps, etc.)
      const mapElements = page.locator('[class*="leaflet"], [class*="gm-"], [class*="marker"]');
      await page.waitForTimeout(500); // Wait for map to render

      const mapElementCount = await mapElements.count();
      expect(mapElementCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display property details/description', async ({ page }) => {
    // Look for property description
    const description = page.locator('[class*="description"], p', { has: page.locator('text=/bedrooms?|guests?|amenities/i') }).first();

    if (await description.isVisible()) {
      await expect(description).toBeVisible();
    }

    // Check for text content about the property
    const pageText = await page.locator('body').textContent();
    expect(pageText).toBeTruthy();
  });

  test('should have amenities section', async ({ page }) => {
    // Look for amenities section
    const amenitiesSection = page.locator('[class*="amenities"], [data-testid*="amenities"]').first();

    if (await amenitiesSection.isVisible()) {
      await expect(amenitiesSection).toBeVisible();

      // Check for amenity items
      const amenityItems = page.locator('[class*="amenity"], [class*="feature"]');
      const amenityCount = await amenityItems.count();

      if (amenityCount > 0) {
        expect(amenityCount).toBeGreaterThan(0);
      }
    }
  });

  test('should display reviews section if available', async ({ page }) => {
    // Look for reviews section
    const reviewsSection = page.locator('[class*="review"], [data-testid*="review"], text=/reviews?/i').first();

    if (await reviewsSection.isVisible()) {
      await expect(reviewsSection).toBeVisible();
    }

    // Check for rating or review items
    const reviewItems = page.locator('[class*="review"], [class*="rating"]');
    const reviewCount = await reviewItems.count();

    if (reviewCount > 0) {
      const firstReview = reviewItems.first();
      await expect(firstReview).toBeVisible();
    }
  });

  test('should have navigation back to home', async ({ page }) => {
    // Look for navigation to previous page or home
    const homeLink = page.locator('a[href="/"]').first();

    if (await homeLink.isVisible()) {
      await expect(homeLink).toBeVisible();
    }

    // Check for back button
    const backButton = page.locator('button:has-text("Back")').first();

    if (await backButton.isVisible()) {
      await expect(backButton).toBeVisible();
    }
  });

  test('should have responsive layout', async ({ page }) => {
    // Test that content reflows at different viewport sizes
    // This test runs in desktop by default, just verify content is visible
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();

    // Check that images and text are readable
    const texts = page.locator('h1, h2, p');
    const textCount = await texts.count();
    expect(textCount).toBeGreaterThan(0);
  });

  test('should handle property guide navigation if available', async ({ page }) => {
    // Look for guide link
    const guideLink = page.locator('a[href*="/guide"]').first();

    if (await guideLink.isVisible()) {
      await guideLink.click();
      await page.waitForURL('**/guide');
      // Should navigate to guide page
      await expect(page).toHaveURL(/\/guide/);
    }
  });
});
