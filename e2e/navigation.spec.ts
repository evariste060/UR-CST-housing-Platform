import { expect, test } from '@playwright/test';

test.describe('search fields', () => {
  test('the navbar search is one bar with a blue button on the right', async ({ page }) => {
    await page.goto('/design-system');
    const bar = page.getByRole('search');
    const input = bar.getByRole('textbox', { name: 'Search accommodation' });
    const button = bar.getByRole('button', { name: 'Search' });
    await expect(bar.getByRole('button')).toHaveCount(1);

    const box = (await bar.boundingBox())!;
    const field = (await input.boundingBox())!;
    const submit = (await button.boundingBox())!;
    const icon = (await bar.locator('span > .ic').boundingBox())!;
    expect(box.height).toBe(44);
    expect(submit.width).toBe(56);
    expect(submit.height).toBe(42);
    expect(field.x + field.width).toBe(submit.x);
    expect(submit.x + submit.width).toBe(box.x + box.width - 1);
    expect(icon.x - box.x).toBeGreaterThanOrEqual(20);
    expect(icon.x + icon.width).toBeLessThan(field.x + 64);
    expect(icon.y + icon.height / 2).toBeCloseTo(box.y + box.height / 2, 0);
    await expect(input).toHaveCSS('padding-left', '64px');
    await expect(input).toHaveCSS('font-size', '16px');
    await expect(button).toHaveCSS('background-color', 'rgb(37, 99, 235)');
    await expect(button).toHaveCSS('border-top-left-radius', '0px');

    await expect(bar).toHaveCSS('box-shadow', 'none');
    await input.click();
    await expect(bar).toHaveCSS('border-top-color', 'rgb(37, 99, 235)');
    await expect(bar).toHaveCSS('box-shadow', 'none');
    await input.blur();
    await expect(bar).toHaveCSS('box-shadow', 'none');
  });

  for (const width of [641, 768, 900, 1101, 1280, 1440]) {
    test(`the navbar search fits at ${width}px wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/design-system');
      const bar = page.getByRole('search');
      const box = (await bar.boundingBox())!;
      const logo = (await page.locator('.header .logo').boundingBox())!;
      const controls = (await page.locator('.hctl').boundingBox())!;
      const header = (await page.locator('.header').boundingBox())!;

      expect(box.x).toBeGreaterThanOrEqual(logo.x + logo.width);
      expect(box.x + box.width).toBeLessThanOrEqual(controls.x);
      expect(box.height).toBeLessThan(header.height);
      await expect(page.locator('.qf-m')).toBeHidden();
      const sideways = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(sideways).toBe(false);
    });
  }

  for (const width of [640, 360, 901, 1024, 1100]) {
    test(`Quick find replaces the navbar search at ${width}px wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/design-system');
      await expect(page.getByRole('search')).toBeHidden();
      await expect(page.locator('.qf-m')).toBeVisible();
    });
  }

  test('the navbar search works with Enter and with its icon', async ({ page }) => {
    await page.goto('/design-system');
    const input = page.getByRole('textbox', { name: 'Search accommodation' });

    await input.fill('Kiyovu');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/search/);
    await expect(page).toHaveURL(/Kiyovu/);

    await page.goto('/design-system');
    await input.fill('Gitega');
    await page.getByRole('search').getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL(/Gitega/);
  });
});

test('the dialog icon sits in its coloured square', async ({ page }) => {
  await page.goto('/design-system');
  await page.getByRole('button', { name: 'Confirmation dialog' }).click();
  const icon = page.locator('.modal .m-ic');
  await expect(icon).toHaveCSS('width', '44px');
  await expect(icon).toHaveCSS('height', '44px');
  await expect(icon).toHaveCSS('display', 'grid');
});

for (const [name, path, selector] of [
  ['search', '/search', 'article.pcard'],
  ['landing', '/', 'section article'],
] as const) {
  test(`the ${name} card arrows change the photo`, async ({ page }) => {
    await page.goto(path);
    const card = page.locator(selector).first();
    const title = (await card.getAttribute('aria-label'))!;
    const image = card.locator('img').first();
    const next = card.getByRole('button', { name: `Next photo of ${title}` });
    const previous = card.getByRole('button', { name: `Previous photo of ${title}` });
    await expect(card.locator('.photo-count')).toContainText('1 / ');
    const first = await image.getAttribute('src');
    const url = page.url();

    await next.click();
    await expect(card.locator('.photo-count')).toContainText('2 / ');
    await expect(image).not.toHaveAttribute('src', first!);
    expect(page.url()).toBe(url);

    await previous.click();
    await expect(image).toHaveAttribute('src', first!);
    await previous.click();
    await expect(card.locator('.photo-count')).not.toContainText('1 / ');

    const overlaps = await card.evaluate((element) => {
      const box = (el: Element) => el.getBoundingClientRect();
      const touches = (a: DOMRect, b: DOMRect) =>
        a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const arrows = [...element.querySelectorAll('button[aria-label*="photo of"]')].map(box);
      const others = [
        ...element.querySelectorAll('.save-btn, .badge, .photo-count, span[class*="top-2"]'),
      ].map(box);
      return arrows.some((arrow) => others.some((other) => touches(arrow, other)));
    });
    expect(overlaps).toBe(false);
  });
}

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
    await expect(home).toHaveCSS('color', 'rgb(37, 99, 235)');
    await expect(home).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    await home.hover();
    await expect(home).toHaveCSS('background-color', 'rgb(219, 230, 254)');
  });
});
