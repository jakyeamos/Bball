import { test, expect } from '@playwright/test';

test('unconfigured remote retains local guest entry and visible fallback', async ({ page }) => {
  const attempted: string[] = [];
  // Only this test's owned Vite server may receive HTTP requests.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:31236') return route.continue();
    attempted.push(url.origin);
    return route.abort();
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Welcome back to Court Vision/i })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('court-vision.guest-user-id'))).toMatch(/^guest-/);
  const guest = await page.evaluate(() => localStorage.getItem('court-vision.guest-user-id'));
  await page.goto('/login');
  await expect(page.getByText('Supabase is not configured in this runtime, so account sign-in is unavailable. The rest of the learning platform still works in guest mode.')).toBeVisible();
  await expect(page.locator('input[type=email]')).toHaveCount(0);
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: /Find the next lesson or recap/i })).toBeVisible();
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('court-vision.guest-user-id'))).toBe(guest);
  expect(attempted.filter(origin => origin.includes('supabase'))).toEqual([]);
});
