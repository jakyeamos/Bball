import { expect, test } from '@playwright/test';

test.describe('Court Vision entry routes', () => {
  test('home, library, and lobby render stable entry surfaces', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Welcome back to Court Vision/i })).toBeVisible();

    await page.goto('/library');
    await expect(page.getByRole('heading', { name: /Find the next lesson or recap/i })).toBeVisible();

    await page.goto('/lobby');
    await expect(page.getByRole('heading', { name: /Create your draft room/i })).toBeVisible();
    await expect(page.getByText(/Name your team/i)).toBeVisible();
  });

  test('Draft Sim CTA opens draft entry instead of active draft state', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Draft Simulator', exact: true }).click();

    await expect(page).toHaveURL(/\/draft-sim$/);
    await expect(page.getByRole('heading', { name: /Apply what you learned in a live draft room/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Create or join a lobby/i })).toBeVisible();
  });
});
