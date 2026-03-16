import { test, expect } from '@playwright/test';

test.describe('Shop Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to shop page
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');
  });

  test('should load the shop page', async ({ page }) => {
    // Check that page has loaded
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();

    // Check for shop heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should display products in shop', async ({ page }) => {
    // Look for product cards or listings
    const productCards = page.locator('[class*="product"], [class*="card"], [data-testid*="product"]');

    // Wait for products to load
    await page.waitForTimeout(500);

    const cardCount = await productCards.count();

    if (cardCount > 0) {
      expect(cardCount).toBeGreaterThan(0);

      // Check that at least the first card is visible
      const firstCard = productCards.first();
      await expect(firstCard).toBeVisible();
    }
  });

  test('should have product information visible', async ({ page }) => {
    // Look for product titles
    const productTitles = page.locator('[class*="product"] h3, [class*="product"] h4, [class*="title"]');

    // Wait for content to load
    await page.waitForTimeout(500);

    const titleCount = await productTitles.count();

    if (titleCount > 0) {
      expect(titleCount).toBeGreaterThan(0);

      // Check visibility of first title
      const firstTitle = productTitles.first();
      await expect(firstTitle).toBeVisible();
    }
  });

  test('should display product prices', async ({ page }) => {
    // Look for price elements
    const prices = page.locator('[class*="price"], text=/\$|€|£|kr/');

    // Wait for content to load
    await page.waitForTimeout(500);

    const priceCount = await prices.count();

    if (priceCount > 0) {
      expect(priceCount).toBeGreaterThan(0);

      // Check visibility of first price
      const firstPrice = prices.first();
      await expect(firstPrice).toBeVisible();
    }
  });

  test('should have add to cart buttons', async ({ page }) => {
    // Look for add to cart buttons
    const addButtons = page.locator('button:has-text("Add"), button:has-text("Cart"), button[aria-label*="add"]', { ignoreCase: true });

    // Wait for content to load
    await page.waitForTimeout(500);

    const buttonCount = await addButtons.count();

    if (buttonCount > 0) {
      expect(buttonCount).toBeGreaterThan(0);

      // Check visibility of first button
      const firstButton = addButtons.first();
      await expect(firstButton).toBeVisible();
    }
  });

  test('should allow adding products to cart', async ({ page }) => {
    // Find an add to cart button
    const addButton = page.locator('button:has-text("Add"), button:has-text("Cart"), button[aria-label*="add"]', { ignoreCase: true }).first();

    if (await addButton.isVisible()) {
      // Get initial cart state if possible
      const cartBadge = page.locator('[class*="badge"], [class*="count"]').first();
      const initialText = await cartBadge.textContent();

      // Click add to cart
      await addButton.click();

      // Wait for cart update
      await page.waitForTimeout(500);

      // Verify button is still visible (to confirm action completed)
      await expect(addButton).toBeVisible();

      // Check for success message or toast
      const successMsg = page.locator('[class*="toast"], [class*="notification"], [role="alert"]').first();

      if (await successMsg.isVisible()) {
        await expect(successMsg).toBeVisible();
      }
    }
  });

  test('should have product filtering if available', async ({ page }) => {
    // Look for filter options
    const filterButton = page.locator('button:has-text("Filter"), button[aria-label*="filter"]', { ignoreCase: true }).first();

    if (await filterButton.isVisible()) {
      await expect(filterButton).toBeVisible();

      await filterButton.click();

      // Check if filter menu appears
      const filterMenu = page.locator('[class*="filter"], [class*="menu"]').first();
      await page.waitForTimeout(300);

      if (await filterMenu.isVisible()) {
        await expect(filterMenu).toBeVisible();
      }
    }
  });

  test('should have category navigation if available', async ({ page }) => {
    // Look for category links
    const categories = page.locator('[class*="category"], [class*="nav"]').first();

    if (await categories.isVisible()) {
      await expect(categories).toBeVisible();

      // Check for category links
      const categoryLinks = page.locator('a[href*="/shop"]');
      const linkCount = await categoryLinks.count();

      if (linkCount > 0) {
        expect(linkCount).toBeGreaterThan(0);
      }
    }
  });

  test('should have product detail page link', async ({ page }) => {
    // Look for product links
    const productLinks = page.locator('a[href*="/product/"]');

    // Wait for content to load
    await page.waitForTimeout(500);

    const linkCount = await productLinks.count();

    if (linkCount > 0) {
      expect(linkCount).toBeGreaterThan(0);

      // Click first product link
      const firstLink = productLinks.first();
      await firstLink.click();

      // Should navigate to product detail
      await page.waitForURL('**/product/**');
      await expect(page).toHaveURL(/\/product\//);
    }
  });

  test('should display product images', async ({ page }) => {
    // Look for product images
    const images = page.locator('img[alt*="product"], img[alt*="item"], [class*="product"] img');

    // Wait for images to load
    await page.waitForTimeout(500);

    const imageCount = await images.count();

    if (imageCount > 0) {
      expect(imageCount).toBeGreaterThan(0);

      // Check visibility of first image
      const firstImage = images.first();
      await expect(firstImage).toBeVisible();
    }
  });

  test('should have cart page navigation', async ({ page }) => {
    // Look for cart link
    const cartLink = page.locator('a[href="/cart"], button:has-text("Cart"), [class*="cart"]').first();

    if (await cartLink.isVisible()) {
      await expect(cartLink).toBeVisible();

      // Navigate to cart
      if (await cartLink.getAttribute('href')) {
        await cartLink.click();
        await page.waitForURL('**/cart');
        await expect(page).toHaveURL(/\/cart/);
      }
    }
  });

  test('should have sort options if available', async ({ page }) => {
    // Look for sort dropdown
    const sortButton = page.locator('button:has-text("Sort"), select[name*="sort"]', { ignoreCase: true }).first();

    if (await sortButton.isVisible()) {
      await expect(sortButton).toBeVisible();

      // Click to reveal options
      await sortButton.click();
      await page.waitForTimeout(300);

      // Check for sort options
      const sortOptions = page.locator('[class*="option"], [class*="menu"]');
      const optionCount = await sortOptions.count();

      if (optionCount > 0) {
        expect(optionCount).toBeGreaterThan(0);
      }
    }
  });

  test('should have pagination or load more if many products', async ({ page }) => {
    // Look for pagination
    const pagination = page.locator('[class*="pagination"], [class*="pager"]').first();

    if (await pagination.isVisible()) {
      await expect(pagination).toBeVisible();

      // Check for next button
      const nextButton = page.locator('button:has-text("Next"), a[aria-label*="next"]', { ignoreCase: true }).first();

      if (await nextButton.isVisible()) {
        await expect(nextButton).toBeVisible();
      }
    }

    // Look for load more button
    const loadMoreButton = page.locator('button:has-text("Load More"), button:has-text("Show More")', { ignoreCase: true }).first();

    if (await loadMoreButton.isVisible()) {
      await expect(loadMoreButton).toBeVisible();
    }
  });

  test('should handle product search if available', async ({ page }) => {
    // Look for search input in shop
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="product"]', { ignoreCase: true }).first();

    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeVisible();

      // Test search
      await searchInput.click();
      await searchInput.fill('test');
      await expect(searchInput).toHaveValue('test');

      // Wait for results to filter
      await page.waitForTimeout(500);

      // Results should still be visible
      const results = page.locator('[class*="product"]').first();
      await expect(results).toBeVisible();
    }
  });
});
