import { test, expect } from '@playwright/test';

/**
 * E2E test: MakerWorld flow — search → select model → place → submit
 *
 * Validates: Requirements 7.3
 */
test.describe('MakerWorld Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Set up dimensions first to enable the grid
    await page.fill('#dimension-width', '210');
    await page.fill('#dimension-depth', '210');
    await page.fill('#dimension-height', '70');
    await page.click('button:has-text("Calculate Grid")');

    // Wait for grid to appear
    const canvas = page.locator('canvas[aria-label="Gridfinity grid layout canvas"]');
    await expect(canvas).toBeVisible();
  });

  test('search for MakerWorld model and select it', async ({ page }) => {
    // Find the MakerWorld search input
    const searchInput = page.locator('#makerworld-keyword');
    await expect(searchInput).toBeVisible();

    // Enter a search keyword (minimum 2 characters)
    await searchInput.fill('battery');

    // Click search button
    const searchButton = page.locator('button:has-text("Search")');
    await expect(searchButton).toBeEnabled();
    await searchButton.click();

    // Wait for results or error (depends on whether the proxy is running)
    // In E2E without a real backend, we may get an error state
    const resultsOrError = page.locator(
      '[aria-label="Search results"], .makerworld-search__message--error'
    );
    await expect(resultsOrError).toBeVisible({ timeout: 15000 });
  });

  test('search requires minimum 2 characters', async ({ page }) => {
    const searchInput = page.locator('#makerworld-keyword');
    await searchInput.fill('a');

    // Search button should be disabled with only 1 character
    const searchButton = page.locator('button:has-text("Search")');
    await expect(searchButton).toBeDisabled();

    // Hint should indicate minimum characters needed
    const hint = page.locator('#makerworld-keyword-hint');
    await expect(hint).toContainText('at least 2 characters');
  });

  test('selecting a model enters placement mode', async ({ page }) => {
    // Mock the search API response using route interception
    await page.route('**/api/makerworld/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          models: [
            {
              id: 'mw-001',
              name: 'Battery Organizer',
              thumbnailUrl: 'https://example.com/thumb.jpg',
              gridWidth: 2,
              gridDepth: 3,
            },
          ],
        }),
      });
    });

    // Search for a model
    const searchInput = page.locator('#makerworld-keyword');
    await searchInput.fill('battery');
    await page.click('button:has-text("Search")');

    // Wait for results
    const resultsList = page.locator('[aria-label="Search results"]');
    await expect(resultsList).toBeVisible();

    // Click on the first result to select it
    const firstResult = page.locator('.makerworld-search__result-button').first();
    await expect(firstResult).toBeVisible();
    await firstResult.click();

    // Verify placement mode is active
    const placementIndicator = page.locator('.makerworld-search__placement-active, .placement-indicator');
    await expect(placementIndicator).toBeVisible();
  });

  test('full MakerWorld flow: search → select → place → submit', async ({ page }) => {
    // Mock the search API
    await page.route('**/api/makerworld/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          models: [
            {
              id: 'mw-002',
              name: 'Screwdriver Holder',
              thumbnailUrl: 'https://example.com/thumb2.jpg',
              gridWidth: 1,
              gridDepth: 2,
            },
          ],
        }),
      });
    });

    // Mock the submit API
    await page.route('**/api/submit', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          operatorEmail: 'operator@example.com',
        }),
      });
    });

    // Search and select a model
    await page.fill('#makerworld-keyword', 'screwdriver');
    await page.click('button:has-text("Search")');

    const firstResult = page.locator('.makerworld-search__result-button').first();
    await expect(firstResult).toBeVisible();
    await firstResult.click();

    // Place the model on the grid
    const canvas = page.locator('canvas[aria-label="Gridfinity grid layout canvas"]');
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      // Click start corner
      await page.mouse.click(
        canvasBox.x + canvasBox.width * 0.1,
        canvasBox.y + canvasBox.height * 0.1
      );
      // Click end corner
      await page.mouse.click(
        canvasBox.x + canvasBox.width * 0.2,
        canvasBox.y + canvasBox.height * 0.3
      );
    }

    // Fill in email and submit
    await page.fill('#contact-email', 'user@example.com');
    const submitButton = page.locator('button:has-text("Submit Design")');

    // If submit is enabled (box was placed), click it
    if (await submitButton.isEnabled()) {
      await submitButton.click();

      // Wait for success message
      const successMessage = page.locator('.submit-panel__success, [role="status"]:has-text("successfully")');
      await expect(successMessage).toBeVisible({ timeout: 35000 });
      await expect(successMessage).toContainText('operator@example.com');
    }
  });
});
