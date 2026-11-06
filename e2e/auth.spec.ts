import { expect, test } from '@playwright/test';

// These tests use the seeded demo accounts. Run npm run db:reset if the data has changed.
const PASSWORD = 'demo1234';

test.describe('demo accounts land on the right home', () => {
  for (const [button, heading] of [
    ['Demo Student', 'Welcome back, Demo Student'],
    ['Demo Landlord A', 'Landlord dashboard'],
    ['Demo Administrator', 'Administrator dashboard'],
  ] as const) {
    test(`${button} opens the ${heading}`, async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: new RegExp(button) }).click();

      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText(`Signed in as ${button}.`)).toBeVisible();
    });
  }

  test('a typed login works and survives a reload', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('admin@demo.ur');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Administrator dashboard' })).toBeVisible();
  });
});

test('a suspended user sees why they cannot log in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('landlord.d@demo.ur');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();

  await expect(page.getByRole('alert')).toContainText('Your account has been suspended');
  await expect(page).toHaveURL(/\/login$/);
});

test('logging out returns to a guest session', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Demo Student/ }).click();
  await expect(page).toHaveURL(/\/student$/);

  await page.goto('/account');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByText('You have signed out.')).toBeVisible();

  await page.goto('/student');
  await expect(
    page.getByRole('heading', { name: 'Sign in as a student to open this page' }),
  ).toBeVisible();
});

test('a student cannot open the administrator area', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Demo Student/ }).click();
  await expect(page).toHaveURL(/\/student$/);

  await page.goto('/admin');

  await expect(
    page.getByRole('heading', { name: 'Sign in as an administrator to open this page' }),
  ).toBeVisible();
});
