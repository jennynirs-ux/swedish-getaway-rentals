# Playwright E2E Testing - Quick Reference

## Start Testing in 60 Seconds

```bash
# Option 1: Run tests in headless mode (fastest)
npm run test:e2e

# Option 2: Run with interactive UI (best for development)
npm run test:e2e:ui

# Option 3: Run in visible browser (great for debugging)
npm run test:e2e:headed
```

## File Structure

```
/sessions/charming-quirky-carson/swedish-getaway-rentals/
├── playwright.config.ts          # Main configuration file
├── E2E_TESTING.md               # Full documentation
├── PLAYWRIGHT_QUICK_REFERENCE.md # This file
├── package.json                  # Updated with test:e2e scripts
└── e2e/                         # Test files directory
    ├── home.spec.ts             # 10 tests - Homepage
    ├── property.spec.ts         # 11 tests - Property pages
    ├── auth.spec.ts             # 12 tests - Authentication
    ├── search.spec.ts           # 12 tests - Search/Filters
    └── shop.spec.ts             # 13 tests - Shop page
```

## Most Useful Commands

| Command | What It Does |
|---------|-------------|
| `npm run test:e2e` | Run all tests (background, no UI) |
| `npm run test:e2e:ui` | Open Playwright UI with test controls |
| `npm run test:e2e:headed` | Run tests in visible browser window |
| `npm run test:e2e -- -g "homepage"` | Run only tests matching "homepage" |
| `npm run test:e2e -- e2e/home.spec.ts` | Run only home.spec.ts |
| `npx playwright show-report` | View HTML report of last run |

## Test Suites Overview

### home.spec.ts (10 tests)
Tests homepage functionality including navigation, hero section, property cards, search, footer.

```bash
npm run test:e2e -- e2e/home.spec.ts
```

### property.spec.ts (11 tests)
Tests property detail pages with image gallery, booking form, map, reviews, amenities.

```bash
npm run test:e2e -- e2e/property.spec.ts
```

### auth.spec.ts (12 tests)
Tests authentication including login, signup, form validation, password recovery.

```bash
npm run test:e2e -- e2e/auth.spec.ts
```

### search.spec.ts (12 tests)
Tests search and filtering functionality for properties.

```bash
npm run test:e2e -- e2e/search.spec.ts
```

### shop.spec.ts (13 tests)
Tests shop page with product display, cart, filters, sorting.

```bash
npm run test:e2e -- e2e/shop.spec.ts
```

## Understanding Test Failures

1. **Test fails** → Check `test-results/` folder
2. **View failure screenshot** → Look for `.png` files
3. **Watch test execution** → Use `npm run test:e2e:ui` or `--headed`
4. **Debug specific test** → `npx playwright test e2e/file.spec.ts --debug`

## Common Test Patterns

### Check if element exists and is visible
```typescript
const element = page.locator('[data-testid="my-element"]');
await expect(element).toBeVisible();
```

### Fill and submit a form
```typescript
const input = page.locator('input[type="email"]');
await input.fill('test@example.com');
await input.press('Enter');
```

### Click and navigate
```typescript
const link = page.locator('a[href="/shop"]');
await link.click();
await page.waitForURL('**/shop');
await expect(page).toHaveURL(/\/shop/);
```

### Wait for element and interact
```typescript
const button = page.locator('button:has-text("Submit")');
await button.click();
await page.waitForTimeout(500); // Wait for response
await expect(button).toBeVisible(); // Verify success
```

## Tips for Success

1. **Use data-testid** - Most reliable selector for tests
2. **No hardcoded sleeps** - Use auto-waiting instead
3. **Flexible selectors** - Test multiple selector patterns for resilience
4. **Check visibility** - Always verify elements are visible before interacting
5. **Keyboard testing** - Include keyboard navigation in tests
6. **Mobile friendly** - Tests work but UI mode helps spot responsive issues

## Troubleshooting

**Tests timeout?**
- Check if dev server is running (`npm run dev`)
- Verify port 8080 is available
- Check `playwright.config.ts` timeout settings

**Selectors not working?**
- Use `npm run test:e2e:ui` to inspect elements
- Try multiple selector patterns
- Check element is actually visible on page

**Flaky tests?**
- Never use `page.waitForTimeout()` unnecessarily
- Use proper locators with auto-waiting
- Avoid depending on animation timing

**CI/CD issues?**
- Tests use `--headed` flag locally by default
- CI detects `CI` environment variable automatically
- All tests run headless in CI for performance

## Additional Resources

- Full guide: See `E2E_TESTING.md`
- Playwright docs: https://playwright.dev
- Test examples: Look inside `e2e/` directory
- Configuration: See `playwright.config.ts`

## Adding New Tests

1. Create file: `e2e/feature.spec.ts`
2. Use template from existing test
3. Run: `npm run test:e2e -- e2e/feature.spec.ts`
4. Iterate with `npm run test:e2e:ui`

## Key Statistics

- **Total Test Files**: 5
- **Total Test Cases**: 58
- **Browsers Tested**: 3 (Chrome, Firefox, Safari)
- **Configuration**: Fully setup, zero-config needed
- **Ready for CI/CD**: Yes
- **Debugging Tools**: UI mode, Inspector, Traces, Screenshots
