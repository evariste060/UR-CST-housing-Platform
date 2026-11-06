import { expect, test } from '@playwright/test';

test('the home page reaches the API', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('UR-CST Student Housing');
  await expect(page.getByRole('status')).toContainText('API OK');
});
