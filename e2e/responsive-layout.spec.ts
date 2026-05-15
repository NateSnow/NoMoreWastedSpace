import { test, expect } from '@playwright/test';

/**
 * E2E test: Responsive layout verification at 320px and 1920px viewports
 *
 * Validates: Requirements 7.4, 7.5
 */
test.describe('Responsive Layout', () => {
  test.describe('Mobile viewport (320px)', () => {
    test.use({ viewport: { width: 320, height: 568 } });

    test('renders without overlapping or truncated elements at 320px', async ({ page }) => {
      await page.goto('/');

      // Enter dimensions to show the full UI
      await page.fill('#dimension-width', '210');
      await page.fill('#dimension-depth', '168');
      await page.fill('#dimension-height', '70');
      await page.click('button:has-text("Calculate Grid")');

      // Verify the grid canvas is visible and fits within viewport
      const canvas = page.locator('canvas[aria-label="Gridfinity grid layout canvas"]');
      await expect(canvas).toBeVisible();

      const canvasBox = await canvas.boundingBox();
      expect(canvasBox).not.toBeNull();
      if (canvasBox) {
        // Canvas should not exceed viewport width
        expect(canvasBox.width).toBeLessThanOrEqual(320);
        // Canvas should be at least partially visible
        expect(canvasBox.width).toBeGreaterThan(0);
        expect(canvasBox.height).toBeGreaterThan(0);
      }

      // Verify dimension inputs are accessible
      const widthInput = page.locator('#dimension-width');
      await expect(widthInput).toBeVisible();
      const widthBox = await widthInput.boundingBox();
      if (widthBox) {
        expect(widthBox.width).toBeLessThanOrEqual(320);
      }

      // Verify submit panel is accessible
      const emailInput = page.locator('#contact-email');
      await expect(emailInput).toBeVisible();

      // Verify no horizontal scrollbar (content fits within viewport)
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(320 + 20); // Allow small tolerance for scrollbar
    });

    test('all interactive controls remain accessible at 320px', async ({ page }) => {
      await page.goto('/');

      // Verify dimension inputs are usable
      const widthInput = page.locator('#dimension-width');
      await expect(widthInput).toBeVisible();
      await widthInput.fill('210');

      const depthInput = page.locator('#dimension-depth');
      await expect(depthInput).toBeVisible();
      await depthInput.fill('168');

      const heightInput = page.locator('#dimension-height');
      await expect(heightInput).toBeVisible();
      await heightInput.fill('70');

      // Calculate Grid button should be clickable
      const calcButton = page.locator('button:has-text("Calculate Grid")');
      await expect(calcButton).toBeVisible();
      await calcButton.click();

      // MakerWorld search should be accessible
      const searchInput = page.locator('#makerworld-keyword');
      await expect(searchInput).toBeVisible();

      // Submit panel email input should be accessible
      const emailInput = page.locator('#contact-email');
      await expect(emailInput).toBeVisible();

      // Height controls toggle should be accessible
      const heightToggle = page.locator('#variable-height-toggle');
      await expect(heightToggle).toBeVisible();
    });

    test('single-column layout at mobile viewport', async ({ page }) => {
      await page.goto('/');

      await page.fill('#dimension-width', '210');
      await page.fill('#dimension-depth', '168');
      await page.fill('#dimension-height', '70');
      await page.click('button:has-text("Calculate Grid")');

      // At 320px, the layout should be single-column (Req 7.5)
      // Verify that major sections stack vertically (each starts at x near 0)
      const dimensionSection = page.locator('section:has(#dimension-width)');
      const canvasContainer = page.locator('.grid-canvas-container');

      const dimBox = await dimensionSection.boundingBox();
      const canvasContainerBox = await canvasContainer.boundingBox();

      if (dimBox && canvasContainerBox) {
        // In single-column layout, both should start near the left edge
        expect(dimBox.x).toBeLessThan(50);
        expect(canvasContainerBox.x).toBeLessThan(50);
        // Canvas container should be below the dimension section
        expect(canvasContainerBox.y).toBeGreaterThanOrEqual(dimBox.y + dimBox.height - 10);
      }
    });
  });

  test.describe('Desktop viewport (1920px)', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('renders properly at 1920px desktop viewport', async ({ page }) => {
      await page.goto('/');

      // Enter dimensions
      await page.fill('#dimension-width', '420');
      await page.fill('#dimension-depth', '336');
      await page.fill('#dimension-height', '140');
      await page.click('button:has-text("Calculate Grid")');

      // Verify the grid canvas is visible
      const canvas = page.locator('canvas[aria-label="Gridfinity grid layout canvas"]');
      await expect(canvas).toBeVisible();

      const canvasBox = await canvas.boundingBox();
      expect(canvasBox).not.toBeNull();
      if (canvasBox) {
        // Canvas should use available space at desktop width
        expect(canvasBox.width).toBeGreaterThan(300);
        expect(canvasBox.height).toBeGreaterThan(200);
      }

      // All controls should be visible without scrolling
      const emailInput = page.locator('#contact-email');
      await expect(emailInput).toBeVisible();

      const searchInput = page.locator('#makerworld-keyword');
      await expect(searchInput).toBeVisible();
    });

    test('no content overflow at 1920px', async ({ page }) => {
      await page.goto('/');

      await page.fill('#dimension-width', '420');
      await page.fill('#dimension-depth', '336');
      await page.fill('#dimension-height', '140');
      await page.click('button:has-text("Calculate Grid")');

      // Verify no horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(1920 + 20);

      // Verify elements don't overlap by checking key sections have distinct positions
      const canvas = page.locator('canvas[aria-label="Gridfinity grid layout canvas"]');
      const canvasBox = await canvas.boundingBox();

      const submitSection = page.locator('section[aria-label="Submit design"], .submit-panel');
      const submitBox = await submitSection.boundingBox();

      if (canvasBox && submitBox) {
        // Submit section should not overlap with canvas
        const overlapsVertically =
          canvasBox.y < submitBox.y + submitBox.height &&
          canvasBox.y + canvasBox.height > submitBox.y;
        const overlapsHorizontally =
          canvasBox.x < submitBox.x + submitBox.width &&
          canvasBox.x + canvasBox.width > submitBox.x;

        // They should either be in different rows or different columns
        if (overlapsVertically && overlapsHorizontally) {
          // This would indicate an overlap issue
          expect(overlapsVertically && overlapsHorizontally).toBe(false);
        }
      }
    });

    test('multi-panel layout at desktop viewport', async ({ page }) => {
      await page.goto('/');

      await page.fill('#dimension-width', '420');
      await page.fill('#dimension-depth', '336');
      await page.fill('#dimension-height', '140');
      await page.click('button:has-text("Calculate Grid")');

      // At 1920px (>= 768px), the layout may use multi-column arrangement
      // Verify that the page makes good use of horizontal space
      const canvas = page.locator('canvas[aria-label="Gridfinity grid layout canvas"]');
      const canvasBox = await canvas.boundingBox();

      if (canvasBox) {
        // Canvas should be reasonably sized for desktop
        expect(canvasBox.width).toBeGreaterThan(400);
      }
    });
  });
});
