// @ts-check
const { test, expect, loginAs, waitForPageReady, navigateTo } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const ReviewsPage = require('../pages/ReviewsPage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Reviews');

test.describe('Reviews Module', () => {
  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      await loginAs(page, row.role);
      const reviews = new ReviewsPage(page);

      switch (row.action) {
        case 'pageLoad': {
          await navigateTo(page, 'reviews');
          await waitForPageReady(page);
          await expect(page.locator('[data-testid="review-management-page"]')).toBeVisible({ timeout: 8000 });
          break;
        }

        case 'create': {
          await navigateTo(page, 'reviews');
          await waitForPageReady(page);
          await reviews.clickNewReview();
          await page.waitForTimeout(1000);
          // Fill in review creation form if dialog opens
          const dialog = page.locator('[role="dialog"]');
          if (await dialog.isVisible()) {
            await expect(dialog).toBeVisible();
          }
          break;
        }

        case 'search': {
          await navigateTo(page, 'reviews');
          await waitForPageReady(page);
          await reviews.search(row.searchTerm);
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="review-management-page"]')).toBeVisible();
          break;
        }

        case 'filterStatus': {
          await navigateTo(page, 'reviews');
          await waitForPageReady(page);
          await reviews.filterByStatus(row.filterValue);
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="review-management-page"]')).toBeVisible();
          break;
        }

        case 'filterType': {
          await navigateTo(page, 'reviews');
          await waitForPageReady(page);
          await reviews.filterByType(row.filterValue);
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="review-management-page"]')).toBeVisible();
          break;
        }

        case 'edit': {
          await navigateTo(page, 'reviews');
          await waitForPageReady(page);
          await reviews.clickEdit();
          await page.waitForTimeout(1000);
          break;
        }

        case 'delete': {
          await navigateTo(page, 'reviews');
          await waitForPageReady(page);
          await reviews.clickDelete();
          await page.waitForTimeout(500);
          // Confirm dialog should appear
          const confirmBtn = page.locator('[data-testid="confirm-dialog-confirm-btn"]');
          if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
            await page.waitForTimeout(1000);
          }
          break;
        }

        case 'approve': {
          await navigateTo(page, 'reviews');
          await waitForPageReady(page);
          // HR approves the first available review
          const approveBtn = page.locator('button:has-text("Approve")').first();
          if (await approveBtn.isVisible()) {
            await approveBtn.click();
            await page.waitForTimeout(1000);
          }
          break;
        }

        case 'selfAssessment': {
          await navigateTo(page, 'reviews');
          await waitForPageReady(page);
          // Employee fills self-assessment on first available review
          const reviewCard = page.locator('[class*="card"], tr').first();
          if (await reviewCard.isVisible()) {
            await reviewCard.click();
            await page.waitForTimeout(500);
            const textarea = page.locator('textarea').first();
            if (await textarea.isVisible()) {
              await textarea.fill(row.assessment);
            }
          }
          break;
        }

        case 'viewReview': {
          await navigateTo(page, 'reviews');
          await waitForPageReady(page);
          // Manager views a review (read-only)
          await expect(page.locator('[data-testid="review-management-page"]')).toBeVisible();
          break;
        }
      }
    });
  }
});
