import type { Page } from '@playwright/test';

/** Logs in with a seeded account from the login form. Run npm run db:reset if the data changed. */
export async function logIn(page: Page, email: string) {
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('demo1234');
  await page.locator('form').getByRole('button', { name: 'Log in' }).click();
}
