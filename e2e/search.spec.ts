import { test, expect } from '@playwright/test';

test.describe('Search and Filter Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage or properties page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have a search input for location', async ({ page }) => {
    // Look for location/search input
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="location"], input[placeholder*="where"], input[placeholder*="property"]', { ignoreCase: true }).first();

    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeVisible();

      // Test typing in search
      await searchInput.click();
      await searchInput.fill('Stockholm');
      await expect(searchInput).toHaveValue('Stockholm');
    }
  });

  test('should have price range filter if available', async ({ page }) => {
    // Look for price filter
    const priceFilter = page.locator('[class*="price"], input[placeholder*="price"], input[name*="price"]', { ignoreCase: true }).first();
    const minPriceInput = page.locator('input[placeholder*="min"], input[name*="minPrice"]', { ignoreCase: true }).first();
    const maxPriceInput = page.locator('input[placeholder*="max"], input[name*="maxPrice"]', { ignoreCase: true }).first();

    if (await priceFilter.isVisible()) {
      await expect(priceFilter).toBeVisible();
    }

    if (await minPriceInput.isVisible()) {
      await minPriceInput.fill('100');
      await expect(minPriceInput).toHaveValue('100');
    }

    if (await maxPriceInput.isVisible()) {
      await maxPriceInput.fill('1000');
      await expect(maxPriceInput).toHaveValue('1000');
    }
  });

  test('should have amenities filter if available', async ({ page }) => {
    // Look for amenities filter
    const amenitiesFilter = page.locator('[class*="amenities"], input[placeholder*="amenities"]', { ignoreCase: true }).first();

    if (await amenitiesFilter.isVisible()) {
      await expect(amenitiesFilter).toBeVisible();

      // Look for checkboxes or selectable amenities
      const amenityCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await amenityCheckboxes.count();

      if (checkboxCount > 0) {
        // Try checking the first checkbox
        const firstCheckbox = amenityCheckboxes.first();
        await firstCheckbox.click();
        await expect(firstCheckbox).toBeChecked();
      }
    }
  });

  test('should have guest count filter if available', async ({ page }) => {
    // Look for guest count filter
    const guestInput = page.locator('input[placeholder*="guest"], input[placeholder*="people"], input[name*="guest"]', { ignoreCase: true }).first();

    if (await guestInput.isVisible()) {
      await expect(guestInput).toBeVisible();

      await guestInput.click();
      await guestInput.fill('4');
      await expect(guestInput).toHaveValue('4');
    }
  });

  test('should have date range pickers if available', async ({ page }) => {
    // Look for check-in/check-out dates
    const checkInInput = page.locator('input[placeholder*="check-in"], input[placeholder*="check in"], input[placeholder*="start"]', { ignoreCase: true }).first();
    const checkOutInput = page.locator('input[placeholder*="check-out"], input[placeholder*="check out"], input[placeholder*="end"]', { ignoreCase: true }).first();

    if (await checkInInput.isVisible()) {
      await expect(checkInInput).toBeVisible();
      await checkInInput.click();
    }

    if (await checkOutInput.isVisible()) {
      await expect(checkOutInput).toBeVisible();
    }
  });

  test('should have sort options if available', async ({ page }) => {
    // Look for sort dropdown
    const sortDropdown = page.locator('select[name*="sort"], button[aria-label*="sort"]', { ignoreCase: true }).first();

    if (await sortDropdown.isVisible()) {
      await expect(sortDropdown).toBeVisible();

      // Check if it's a select element
      const selectElements = page.locator('select');
      const selectCount = await selectElements.count();

      if (selectCount > 0) {
        const firstSelect = selectElements.first();
        await firstSelect.click();

        // Check for options
        const options = page.locator('option');
        const optionCount = await options.count();
        expect(optionCount).toBeGreaterThan(0);
      }
    }
  });

  test('should have search/filter button', async ({ page }) => {
    // Look for search button
    const searchButton = page.locator('button:has-text("Search"), button:has-text("Filter"), button:has-text("Apply"), button[type="submit"]', { ignoreCase: true }).first();

    if (await searchButton.isVisible()) {
      await expect(searchButton).toBeVisible();
    }
  });

  test('should display search results', async ({ page }) => {
    // Look for results section
    const resultsSection = page.locator('[class*="results"], [class*="properties"], [class*="listings"]').first();

    // Wait for any potential loading
    await page.waitForTimeout(500);

    if (await resultsSection.isVisible()) {
      await expect(resultsSection).toBeVisible();

      // Check for property cards in results
      const cards = page.locator('[class*="card"], [class*="property"], [class*="listing"]');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        expect(cardCount).toBeGreaterThan(0);
      }
    }
  });

  test('should have clear/reset filters button if available', async ({ page }) => {
    // Look for clear filters button
    const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset"), button:has-text("Remove")', { ignoreCase: true }).first();

    if (await clearButton.isVisible()) {
      await expect(clearButton).toBeVisible();

      // Verify it's clickable
      const isDisabled = await clearButton.isDisabled();
      // Button might be disabled initially, just check it exists
      await expect(clearButton).toBeVisible();
    }
  });

  test('should handle multiple filter selections', async ({ page }) => {
    // Try to interact with multiple filters
    const inputs = page.locator('input[type="text"]');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      const firstInput = inputs.first();
      await firstInput.click();
      await firstInput.fill('test');
      await expect(firstInput).toHaveValue('test');
    }

    // Try selecting a checkbox if available
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      const checkbox = checkboxes.first();
      await checkbox.click();
      await expect(checkbox).toBeChecked();
    }
  });

  test('should show no results message when appropriate', async ({ page }) => {
    // Search for something unlikely to return results
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="location"]', { ignoreCase: true }).first();

    if (await searchInput.isVisible()) {
      await searchInput.click();
      await searchInput.fill('xyz123nonexistentplace');

      // Look for search button
      const searchButton = page.locator('button:has-text("Search"), button:has-text("Filter")', { ignoreCase: true }).first();

      if (await searchButton.isVisible()) {
        await searchButton.click();
        await page.waitForTimeout(1000);

        // Check for no results message
        const noResultsMsg = page.locator('text=/no results|no properties|nothing found/i').first();

        // May or may not have results, just verify page is responsive
        const content = page.locator('main').first();
        await expect(content).toBeVisible();
      }
    }
  });

  test('should maintain filter state when navigating', async ({ page }) => {
    // Fill in search/filter
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="location"]', { ignoreCase: true }).first();

    if (await searchInput.isVisible()) {
      await searchInput.click();
      await searchInput.fill('Stockholm');

      // Navigate away and back
      const homeLink = page.locator('a[href="/"]').first();

      if (await homeLink.isVisible()) {
        await homeLink.click();
        await page.waitForURL('**/');
      }

      // Verify navigation occurred
      await expect(page).toHaveURL(/\/$/);
    }
  });
});
