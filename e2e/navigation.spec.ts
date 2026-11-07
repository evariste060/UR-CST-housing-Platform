import { expect, test } from '@playwright/test';

test.describe('main navigation menus', () => {
  test('resting the mouse on Find Housing opens it without moving focus', async ({ page }) => {
    await page.goto('/design-system');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const button = nav.getByRole('button', { name: 'Find Housing' });
    const link = nav.getByRole('link', { name: 'Single rooms' });

    await button.hover();
    await expect(link).toBeVisible();
    await expect(link).not.toBeFocused();

    // The mouse can travel down into the panel and use it.
    await link.hover();
    await page.waitForTimeout(300);
    await expect(link).toBeVisible();

    await page.mouse.move(640, 500);
    await expect(link).toBeHidden();
  });

  test('a click during hover keeps the menu open, and links still work', async ({ page }) => {
    await page.goto('/design-system');
    const nav = page.getByRole('navigation', { name: 'Main' });

    await nav.getByRole('button', { name: 'Find Housing' }).click();
    const link = nav.getByRole('link', { name: 'Single rooms' });
    await expect(link).toBeVisible();

    await link.click();
    await expect(page).toHaveURL(/\/search\?types=SINGLE/);
    await expect(link).toBeHidden();
  });

  test('the keyboard still opens the menu and moves into it', async ({ page }) => {
    await page.goto('/design-system');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const button = nav.getByRole('button', { name: 'Find Housing' });

    await button.focus();
    await page.keyboard.press('Enter');
    await expect(nav.getByRole('link', { name: 'All accommodation' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(nav.getByRole('link', { name: 'All accommodation' })).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('a touch on the button opens the menu', async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto('/design-system');
    const nav = page.getByRole('navigation', { name: 'Main' });

    await nav.getByRole('button', { name: 'Find Housing' }).tap();
    await expect(nav.getByRole('link', { name: 'Single rooms' })).toBeVisible();
    await context.close();
  });

  test('menu items use regular weight and hover deepens the background', async ({ page }) => {
    await page.goto('/design-system');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const home = nav.getByRole('link', { name: 'Home' });
    const support = nav.getByRole('link', { name: 'Support' });

    await expect(home).toHaveCSS('font-weight', '400');
    await expect(support).toHaveCSS('font-weight', '400');

    await support.hover();
    await expect(support).toHaveCSS('background-color', 'rgb(219, 230, 254)');

    await page.goto('/');
    await page.mouse.move(640, 500);
    await expect(home).toHaveCSS('border-top-color', 'rgb(29, 78, 216)');
    await expect(home).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    await home.hover();
    await expect(home).toHaveCSS('background-color', 'rgb(219, 230, 254)');
  });
});
