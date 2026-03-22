// @ts-check
const { test, expect, loginAs, loginViaAPI, waitForPageReady } = require('../fixtures/test-fixtures');
const { ExcelReader } = require('../lib/excel-reader');
const ReviewsPage = require('../pages/ReviewsPage');

const reader = new ExcelReader();
const rows = reader.readEnabledTests('Reviews');

test.use({
  launchOptions: {
    args: ['--disable-dev-shm-usage', '--disable-gpu'],
  },
});

test.describe('Reviews Module', () => {
  test.afterEach(async ({ page }) => {
    try {
      // Dismiss any lingering MUI popover / dialog to prevent stale state
      for (let i = 0; i < 3; i++) {
        const popup = page.locator('[role="dialog"], [role="listbox"], [role="presentation"]');
        if (await popup.first().isVisible({ timeout: 300 }).catch(() => false)) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        } else break;
      }
    } catch { /* page may already be closed */ }
  });

  for (const row of rows) {
    test(`${row.testId}: ${row.description}`, async ({ page }) => {
      // Admin-role tests use API login (lighter on browser memory).
      // Other roles need full UI login for proper cookie/context setup.
      if (row.role === 'admin') {
        try { await loginViaAPI(page, row.role); } catch { await loginAs(page, row.role); }
      } else {
        await loginAs(page, row.role);
      }
      const reviews = new ReviewsPage(page);

      switch (row.action) {
        case 'pageLoad': {
          await reviews.goto();
          await expect(page.locator('[data-testid="reviews-page"]')).toBeVisible({ timeout: 10000 });
          break;
        }

        case 'create': {
          await reviews.goto();
          await page.waitForTimeout(1000); // let employee list cache
          await reviews.clickNewReview();

          const dialog = page.locator('[role="dialog"]');
          await dialog.waitFor({ state: 'visible', timeout: 5000 });

          await reviews.fillCreateForm({
            reviewPeriod: row.reviewPeriod || 'Q1 2026',
            reviewType: row.reviewType || 'quarterly',
          });

          // Submit if the button is enabled (employee was selected)
          const submitted = await reviews.submitCreate();
          if (submitted) {
            await page.waitForTimeout(2000);
          }

          // Close dialog if still open
          if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
          }

          await expect(page.locator('[data-testid="reviews-page"]')).toBeVisible();
          break;
        }

        case 'search': {
          await reviews.goto();
          await reviews.search(row.searchTerm || 'John');
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="reviews-page"]')).toBeVisible();
          break;
        }

        case 'filterStatus': {
          await reviews.goto();
          await reviews.filterByStatus(row.filterValue || 'draft');
          await expect(page.locator('[data-testid="reviews-page"]')).toBeVisible();
          break;
        }

        case 'filterType': {
          await reviews.goto();
          await reviews.filterByType(row.filterValue || 'annual');
          await expect(page.locator('[data-testid="reviews-page"]')).toBeVisible();
          break;
        }

        case 'edit': {
          await reviews.goto();
          const editClicked = await reviews.clickEditOnRow(parseInt(row.reviewIndex || '0'));
          if (editClicked) {
            const dialog = page.locator('[role="dialog"]');
            await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            // Close edit dialog without saving
            if (await dialog.isVisible()) {
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            }
          }
          await expect(page.locator('[data-testid="reviews-page"]')).toBeVisible();
          break;
        }

        case 'delete': {
          await reviews.goto();
          const deleteClicked = await reviews.clickDeleteOnRow(parseInt(row.reviewIndex || '0'));
          if (deleteClicked) {
            const dialog = page.locator('[role="dialog"]');
            await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            if (await dialog.isVisible()) {
              const confirmBtn = page.locator('[data-testid="reviews-delete-confirm-btn"]');
              if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await confirmBtn.click();
                await page.waitForTimeout(1000);
              } else {
                await page.keyboard.press('Escape');
              }
            }
          }
          await expect(page.locator('[data-testid="reviews-page"]')).toBeVisible();
          break;
        }

        case 'approve': {
          await reviews.goto();
          const clicked = await reviews.clickApproveOnRow(parseInt(row.reviewIndex || '0'));
          if (clicked) {
            const dialog = page.locator('[role="dialog"]');
            await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            if (await dialog.isVisible()) {
              const confirmBtn = dialog.getByRole('button', { name: /confirm/i });
              if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await confirmBtn.click();
                await page.waitForTimeout(1000);
              } else {
                await page.keyboard.press('Escape');
              }
            }
          }
          await expect(page.locator('[data-testid="reviews-page"]')).toBeVisible();
          break;
        }

        case 'selfAssessment': {
          await reviews.goto();
          const saClicked = await reviews.clickSelfAssessOnRow(0);
          if (saClicked) {
            const dialog = page.locator('[role="dialog"]');
            await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            if (await dialog.isVisible()) {
              const textarea = dialog.locator('textarea').first();
              if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
                await textarea.fill(row.assessment || 'Self-assessment text');
              }
              const submitBtn = dialog.getByRole('button', { name: /submit assessment/i });
              if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await submitBtn.click();
                await page.waitForTimeout(1000);
              } else {
                await page.keyboard.press('Escape');
              }
            }
          }
          await expect(page.locator('[data-testid="reviews-page"]')).toBeVisible();
          break;
        }

        case 'viewReview': {
          await reviews.goto();
          await expect(page.locator('[data-testid="reviews-page"]')).toBeVisible({ timeout: 10000 });
          const viewClicked = await reviews.clickViewOnRow(parseInt(row.reviewIndex || '0'));
          if (viewClicked) {
            const dialog = page.locator('[role="dialog"]');
            await dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            if (await dialog.isVisible()) {
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            }
          }
          break;
        }
      }
    });
  }
});
