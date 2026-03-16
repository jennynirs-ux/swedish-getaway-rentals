# Playwright E2E Testing Setup

This project includes a comprehensive Playwright E2E testing infrastructure for testing the Swedish Getaway Rentals application across multiple browsers.

## Installation

Playwright is already installed as a dev dependency. No additional setup required beyond:

```bash
npm install
```

## Configuration

The Playwright configuration is defined in `playwright.config.ts` with the following features:

- **Base URL**: `http://localhost:8080` (Vite dev server)
- **Browsers**: Chrome (Chromium), Firefox, and Safari (WebKit)
- **Web Server**: Automatically starts `npm run dev` before running tests
- **Screenshots**: Captured on test failure for debugging
- **HTML Reporter**: Generates interactive HTML report of test results
- **Timeouts**:
  - Page timeout: 30 seconds
  - Assertion timeout: 5 seconds

## Test Organization

Tests are organized in the `e2e/` directory with the following suites:

### 1. **home.spec.ts** - Homepage Tests
- Page loads and displays hero section
- Navigation links are functional
- Property cards are displayed
- Search form is present and works
- Footer is visible and accessible
- Proper page structure with headings
- Navigation to other pages works correctly

### 2. **property.spec.ts** - Property Page Tests
- Property detail page loads correctly
- Image gallery/carousel is visible and functional
- Booking form is displayed with required fields
- Map displays property location
- Property details and description are visible
- Amenities section exists
- Reviews section displays if available
- Navigation back to homepage works
- Responsive layout functions properly
- Property guide navigation works

### 3. **auth.spec.ts** - Authentication Tests
- Auth page loads properly
- Login and signup tabs/sections exist
- Email input field is present and functional
- Password input field is secure and functional
- Form submission button is visible
- Form validation works on empty submission
- Forgot password option is available
- Social login options display if configured
- Remember me checkbox functions correctly
- Proper form structure and accessibility

### 4. **search.spec.ts** - Search and Filter Tests
- Location/search input is functional
- Price range filters work
- Amenities filters are selectable
- Guest count filter works
- Date range pickers function
- Sort options are available
- Search/filter button triggers results
- Results display properly
- Clear/reset filters button works
- Multiple filters can be combined
- No results message appears when appropriate
- Filter state persists during navigation

### 5. **shop.spec.ts** - Shop Page Tests
- Shop page loads correctly
- Products display as cards with information
- Product titles and prices are visible
- Add to cart buttons are functional
- Products can be added to cart
- Product filtering works if available
- Category navigation displays
- Product detail page links work
- Product images load
- Cart page navigation works
- Sort options function
- Pagination or load more works
- Product search functionality

## Running Tests

### Run All Tests (Headless Mode)
```bash
npm run test:e2e
```

### Run Tests with UI (Interactive Mode)
```bash
npm run test:e2e:ui
```

Launches the Playwright UI with live test execution, step-by-step inspection, and time travel debugging.

### Run Tests in Headed Mode (Visible Browser)
```bash
npm run test:e2e:headed
```

Shows browser window while tests run for visual inspection.

### Run Specific Test File
```bash
npm run test:e2e -- e2e/home.spec.ts
```

### Run Specific Test
```bash
npm run test:e2e -- -g "should load the homepage"
```

### Run Tests in Single Browser
```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

## Test Reports

After running tests, an HTML report is generated at:
```
playwright-report/index.html
```

View the report with:
```bash
npx playwright show-report
```

## Test Results

Test results are saved to `test-results/` directory with:
- Screenshots of failures
- Trace recordings (for debugging)
- Full test execution details

## Best Practices Used

1. **Web-First Assertions**: Tests use Playwright's locators with auto-waiting
2. **Proper Selectors**: Tests use meaningful selectors (data-testid, role, text, etc.)
3. **No Flaky Timing**: Tests avoid `sleep()` and rely on Playwright's auto-waiting
4. **Conditional Visibility**: Tests check if elements exist before asserting on them
5. **Keyboard Accessibility**: Tests verify navigation is keyboard accessible
6. **Responsive Testing**: Tests work across different browser sizes
7. **Error Handling**: Tests gracefully handle missing elements or features
8. **Real User Flows**: Tests simulate actual user interactions

## Continuous Integration

In CI environments (when `CI=true`):
- Tests run sequentially (workers: 1)
- Failed tests retry up to 2 times
- Traces are collected on first retry for debugging
- Screenshots captured on failures

## Debugging Tests

### Debug Single Test
```bash
npx playwright test e2e/home.spec.ts --debug
```

### Using Playwright Inspector
The `--debug` flag launches the Playwright Inspector where you can:
- Step through test execution
- Execute commands in the browser
- Inspect DOM elements
- View network activity

### Viewing Traces
Traces contain:
- Full test execution timeline
- Network requests
- Console logs
- Screenshots

View with:
```bash
npx playwright show-trace trace.zip
```

## Maintenance

### Adding New Tests

1. Create a new test file in `e2e/` directory
2. Follow the existing test structure
3. Use descriptive test names
4. Group related tests in `describe` blocks
5. Use `beforeEach` for common setup

Example:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feature-path');
    await page.waitForLoadState('networkidle');
  });

  test('should display feature correctly', async ({ page }) => {
    const element = page.locator('[data-testid="feature"]');
    await expect(element).toBeVisible();
  });
});
```

### Updating Tests

When UI changes, update selectors in affected tests:
- Use `data-testid` attributes for most reliable selectors
- Fall back to role-based selectors (role="button")
- Use text content only as last resort
- Test against multiple selector patterns for flexibility

## Troubleshooting

### Tests timeout waiting for dev server
- Ensure `npm run dev` works independently
- Check port 8080 is available
- Increase timeout in `playwright.config.ts` if needed

### Selectors not finding elements
- Use Playwright Inspector to inspect actual DOM
- Test with multiple selector patterns
- Use `page.waitForSelector()` if element loads dynamically

### Tests fail in CI but pass locally
- Run tests headless locally: `npm run test:e2e`
- Check for timing issues (use proper waits, not sleep)
- Verify all required environment variables are set

### Flaky tests
- Avoid fixed timeouts, use auto-waiting
- Don't rely on element positions or animations
- Use proper locator strategies with retries
- Check for race conditions in async code

## Resources

- [Playwright Documentation](https://playwright.dev)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
