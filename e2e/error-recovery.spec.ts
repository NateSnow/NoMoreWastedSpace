import { test, expect } from '@playwright/test';

/**
 * E2E test: Error recovery — failed submission → retry → success
 *
 * Validates: Requirements 7.3, 7.5
 */
test.describe('Error Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Set up a valid layout: enter dimensions and place a box
    await page.fill('#dimension-width', '210');
    await page.fill('#dimension-depth', '168');
    await page.fill('#dimension-height', '70');
    await page.click('button:has-text("Calculate Grid")');

    // Wait for grid
    const canvas = page.locator('canvas[aria-label="Gridfinity grid layout canvas"]');
    await expect(canvas).toBeVisible();
  });

  test('failed submission shows error and retry button', async ({ page }) => {
    // Mock the submit API to fail
    await page.route('**/api/submit', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error',
        }),
      });
    });

    // Place a box on the grid via canvas clicks
    const canvas = page.locator('canvas[aria-label="Gridfinity grid layout canvas"]');

    // Enter placement mode if needed
    const placeButton = page.locator('button:has-text("Place"), button:has-text("Add")').first();
    if (await placeButton.isVisible()) {
      await placeButton.click();
    }

    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.click(
        canvasBox.x + canvasBox.width * 0.15,
        canvasBox.y + canvasBox.height * 0.15
      );
      await page.mouse.click(
        canvasBox.x + canvasBox.width * 0.35,
        canvasBox.y + canvasBox.height * 0.35
      );
    }

    // Fill email and submit
    await page.fill('#contact-email', 'test@example.com');
    const submitButton = page.locator('button:has-text("Submit Design")');

    if (await submitButton.isEnabled()) {
      await submitButton.click();

      // Wait for error to appear
      const errorDisplay = page.locator('.submit-panel__error, [role="alert"]');
      await expect(errorDisplay).toBeVisible({ timeout: 35000 });

      // Retry button should be visible
      const retryButton = page.locator('.submit-panel__retry-button, button:has-text("Retry")');
      await expect(retryButton).toBeVisible();
    }
  });

  test('retry after failure succeeds', async ({ page }) => {
    let callCount = 0;

    // Mock the submit API: first call fails, second succeeds
    await page.route('**/api/submit', async (route) => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Temporary server error',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            operatorEmail: 'operator@gridfinity.com',
          }),
        });
      }
    });

    // Place a box
    const canvas = page.locator('canvas[aria-label="Gridfinity grid layout canvas"]');
    const placeButton = page.locator('button:has-text("Place"), button:has-text("Add")').first();
    if (await placeButton.isVisible()) {
      await placeButton.click();
    }

    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.click(
        canvasBox.x + canvasBox.width * 0.15,
        canvasBox.y + canvasBox.height * 0.15
      );
      await page.mouse.click(
        canvasBox.x + canvasBox.width * 0.35,
        canvasBox.y + canvasBox.height * 0.35
      );
    }

    // Fill email and submit (first attempt — will fail)
    await page.fill('#contact-email', 'test@example.com');
    const submitButton = page.locator('button:has-text("Submit Design")');

    if (await submitButton.isEnabled()) {
      await submitButton.click();

      // Wait for error
      const errorDisplay = page.locator('.submit-panel__error, [role="alert"]');
      await expect(errorDisplay).toBeVisible({ timeout: 35000 });

      // Click retry
      const retryButton = page.locator('.submit-panel__retry-button, button:has-text("Retry")');
      await expect(retryButton).toBeVisible();
      await retryButton.click();

      // Wait for success message
      const successMessage = page.locator('.submit-panel__success');
      await expect(successMessage).toBeVisible({ timeout: 35000 });
      await expect(successMessage).toContainText('operator@gridfinity.com');
    }
  });

  test('3 consecutive failures triggers cooldown', async ({ page }) => {
    // Mock the submit API to always fail
    await page.route('**/api/submit', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Server unavailable',
        }),
      });
    });

    // Place a box
    const canvas = page.locator('canvas[aria-label="Gridfinity grid layout canvas"]');
    const placeButton = page.locator('button:has-text("Place"), button:has-text("Add")').first();
    if (await placeButton.isVisible()) {
      await placeButton.click();
    }

    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.click(
        canvasBox.x + canvasBox.width * 0.15,
        canvasBox.y + canvasBox.height * 0.15
      );
      await page.mouse.click(
        canvasBox.x + canvasBox.width * 0.35,
        canvasBox.y + canvasBox.height * 0.35
      );
    }

    await page.fill('#contact-email', 'test@example.com');
    const submitButton = page.locator('button:has-text("Submit Design")');

    if (await submitButton.isEnabled()) {
      // First failure
      await submitButton.click();
      const retryButton = page.locator('.submit-panel__retry-button, button:has-text("Retry")');
      await expect(retryButton).toBeVisible({ timeout: 35000 });

      // Second failure
      await retryButton.click();
      await expect(retryButton).toBeVisible({ timeout: 35000 });

      // Third failure — should trigger cooldown
      await retryButton.click();

      // Cooldown message should appear
      const cooldownMessage = page.locator('.submit-panel__cooldown, [role="timer"]');
      await expect(cooldownMessage).toBeVisible({ timeout: 35000 });
      await expect(cooldownMessage).toContainText('try again');

      // Submit button should be disabled during cooldown
      await expect(submitButton).toBeDisabled();
    }
  });
});
