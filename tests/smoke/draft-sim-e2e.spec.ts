import { expect, test } from '@playwright/test';

test.describe('draft simulator end-to-end', () => {
  test('single-team draft completes into the recap page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto('/lobby');
    await page.getByPlaceholder('Enter your team name').fill('Browser E2E');
    await page.getByRole('button', { name: 'Create Lobby' }).click();

    await page.waitForSelector('form');
    await page.locator('input[type="range"]').nth(0).fill('1');
    await page.locator('input[type="range"]').nth(1).fill('10');

    await page.locator('form button').last().click();
    await expect(page).toHaveURL(/\/waiting-room$/);
    await page.getByRole('button', { name: 'Start Draft' }).click();

    await expect(page).toHaveURL(/\/draft$/);
    await expect(page.getByRole('heading', { name: 'Court Vision Draft Room' })).toBeVisible();

    for (let pick = 0; pick < 10; pick += 1) {
      await page.locator('button:has-text("Pick"):not([disabled])').first().click();
    }

    await expect(page).toHaveURL(/\/draft-recap$/);
    await expect(page.getByRole('heading', { name: 'Draft Recap' })).toBeVisible();
    expect(consoleErrors.filter((error) => error.includes('Maximum update depth exceeded'))).toEqual([]);
  });
});
