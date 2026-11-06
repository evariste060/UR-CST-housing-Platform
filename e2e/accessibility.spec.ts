import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PUBLIC_PAGES = [
  ['/', 'UR-CST Student Housing'],
  ['/design-system', 'Design system'],
  ['/login', 'Log in'],
  ['/register', 'Create an account'],
  ['/forgot-password', 'Reset your password'],
  ['/search', 'Find Housing'],
] as const;

async function pageIsReady(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function seriousProblems(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(({ id, nodes }) => `${id}: ${nodes.map(({ target }) => target.join(' ')).join(', ')}`);
}

async function chooseInPanel(page: Page, group: string, option: RegExp) {
  await page.getByRole('radiogroup', { name: group }).getByRole('radio', { name: option }).click();
}

test.describe('display preferences', () => {
  test('all of them apply on every page and survive a reload', async ({ page }) => {
    await page.goto('/design-system');
    await pageIsReady(page);
    const body = page.locator('body');
    const before = await body.evaluate((element) => {
      const style = getComputedStyle(element);
      return { font: style.fontFamily, size: style.fontSize, line: style.lineHeight };
    });

    await page.getByRole('button', { name: 'Display settings' }).click();
    await chooseInPanel(page, 'Font style', /Atkinson/);
    await chooseInPanel(page, 'Light or dark', /^Dark/);
    await chooseInPanel(page, 'Text size', /Extra large/);
    await chooseInPanel(page, 'Line spacing', /Relaxed/);
    await chooseInPanel(page, 'Contrast', /High contrast/);
    await chooseInPanel(page, 'Highlight where I am', /^On/);
    await page.getByRole('button', { name: 'Done' }).click();

    const check = async () => {
      await pageIsReady(page);
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-font', 'atkinson');
      await expect(html).toHaveClass(/dark/);
      await expect(html).toHaveClass(/xl-text/);
      await expect(html).toHaveClass(/relaxed/);
      await expect(html).toHaveClass(/hc/);
      await expect(html).toHaveClass(/hl/);
      const after = await body.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          font: style.fontFamily,
          size: style.fontSize,
          line: style.lineHeight,
          background: style.backgroundColor,
        };
      });
      expect(after.font).toContain('Atkinson');
      expect(parseFloat(after.size)).toBeGreaterThan(parseFloat(before.size));
      expect(parseFloat(after.line) / parseFloat(after.size)).toBeCloseTo(1.85, 1);
      expect(after.background).toBe('rgb(0, 0, 0)');
    };

    await check();
    await page.reload();
    await check();

    for (const [path] of PUBLIC_PAGES) {
      await page.goto(path);
      await check();
    }
  });

  test('a saved dark theme applies before the first paint', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('urcst-prefs', JSON.stringify({ theme: 'dark' })),
    );
    await page.goto('/design-system');

    await expect(page.locator('html')).toHaveClass(/dark/);
    await pageIsReady(page);
    await expect(page.getByRole('button', { name: 'Light Mode' })).toBeVisible();
  });

  test('workspace pages use them too', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Demo Administrator/ }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole('button', { name: 'Display', exact: true }).click();
    await chooseInPanel(page, 'Light or dark', /^Dark/);
    await page.keyboard.press('Escape');
    await page.goto('/admin/users');

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
  });
});

test.describe('keyboard only', () => {
  test('the skip link is seen and moves past the header', async ({ page }) => {
    await page.goto('/design-system');
    await pageIsReady(page);

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    const box = await skip.boundingBox();
    expect(box?.y).toBeGreaterThanOrEqual(0);

    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  test('every control can be reached by Tab and shows where focus is', async ({ page }) => {
    await page.goto('/design-system');
    await pageIsReady(page);

    const missed = await page.evaluate(() => {
      const selector =
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [role="radio"]';
      const groups = new Set<Element>();
      const expected = [...document.querySelectorAll<HTMLElement>(selector)].filter((element) => {
        if (element.closest('[aria-hidden="true"]') || !element.offsetParent) return false;
        // A radio group is one Tab stop, so only its first radio is counted.
        const group = element.closest('[role="radiogroup"]');
        if (element.getAttribute('role') !== 'radio' || !group) return true;
        if (groups.has(group)) return false;
        groups.add(group);
        return true;
      });
      return expected
        .filter((element) => element.tabIndex < 0 && !element.closest('[role="radiogroup"]'))
        .map((element) => element.outerHTML.slice(0, 80));
    });
    expect(missed).toEqual([]);

    const stops = new Set<string>();
    let withoutRing = 0;
    for (let press = 0; press < 90; press += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement;
        const style = getComputedStyle(element);
        return {
          name: `${element.tagName}:${element.getAttribute('aria-label') ?? element.innerText}`,
          ring: style.boxShadow !== 'none' || style.outlineStyle !== 'none',
        };
      });
      stops.add(info.name);
      if (!info.name.startsWith('BODY') && !info.ring) withoutRing += 1;
    }

    expect(withoutRing).toBe(0);
    for (const name of ['Search', 'Show toast', 'Confirmation dialog', 'View details']) {
      expect([...stops].some((stop) => stop.includes(name))).toBe(true);
    }
  });

  test('a dialog can be used and left with the keyboard alone', async ({ page }) => {
    await page.goto('/design-system');
    await pageIsReady(page);
    const opener = page.getByRole('button', { name: 'Confirmation dialog' });

    await opener.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Delete listing' })).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.getByText('Demo: listing deleted.')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Demo: listing restored.')).toBeVisible();
    await expect(opener).toBeFocused();
  });

  test('Undo waits for someone using the keyboard, and Esc puts them back', async ({ page }) => {
    await page.goto('/design-system');
    await pageIsReady(page);
    const opener = page.getByRole('button', { name: 'Toast with Undo' });

    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeFocused();

    await page.waitForTimeout(8000);
    await expect(page.getByText('Availability updated successfully.')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText('Availability updated successfully.')).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('Undo stays out of the way of someone using a mouse', async ({ page }) => {
    await page.goto('/design-system');
    await pageIsReady(page);

    await page.getByRole('button', { name: 'Toast with Undo' }).click();
    await expect(page.getByText('Availability updated successfully.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).not.toBeFocused();
  });

  test('Quick find goes to a page and focus lands on its title', async ({ page }) => {
    await page.goto('/design-system');
    await pageIsReady(page);

    await page.keyboard.press('Control+k');
    await page.getByLabel('Search pages and accommodation').pressSequentially('favourites');
    await page.keyboard.press('Enter');

    const heading = page.getByRole('heading', { level: 1, name: 'Saved properties' });
    await expect(heading).toBeFocused();
    await expect(page.locator('#announcer')).toHaveText('Now on: Saved properties');
  });
});

test.describe('accessibility scan', () => {
  // A scan takes several seconds, so these run one at a time.
  test.describe.configure({ mode: 'serial', timeout: 60_000 });

  for (const [path] of PUBLIC_PAGES) {
    test(`${path} has no serious problems`, async ({ page }) => {
      await page.goto(path);
      await pageIsReady(page);
      expect(await seriousProblems(page)).toEqual([]);
    });
  }

  for (const [name, prefs] of [
    ['dark', { theme: 'dark' }],
    ['high contrast', { contrast: 'high' }],
    ['dark high contrast', { theme: 'dark', contrast: 'high' }],
  ] as const) {
    test(`the design system has no serious problems in ${name}`, async ({ page }) => {
      await page.addInitScript(
        (saved) => localStorage.setItem('urcst-prefs', JSON.stringify(saved)),
        prefs,
      );
      await page.goto('/design-system');
      await pageIsReady(page);
      expect(await seriousProblems(page)).toEqual([]);
    });
  }

  test('the landlord workspace has no serious problems', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Demo Landlord A/ }).click();
    await expect(page).toHaveURL(/\/landlord$/);
    await pageIsReady(page);

    expect(await seriousProblems(page)).toEqual([]);
  });

  test('the display panel and Quick find have no serious problems', async ({ page }) => {
    await page.goto('/design-system');
    await page.getByRole('button', { name: 'Display settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Display & audio' })).toBeVisible();
    expect(await seriousProblems(page)).toEqual([]);

    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Quick find' })).toBeVisible();
    expect(await seriousProblems(page)).toEqual([]);
  });
});

test.describe('touch targets and small screens', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

  test('controls are at least 44px and the page does not scroll sideways', async ({ page }) => {
    await page.goto('/design-system');
    await pageIsReady(page);

    const tooSmall = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          'a[href], button, select, textarea, [role="radio"]',
        ),
      ]
        .filter((element) => element.offsetParent && !element.closest('.sr-only, .skip-link'))
        .filter((element) => {
          const { width, height } = element.getBoundingClientRect();
          return width < 44 || height < 44;
        })
        .map((element) => element.outerHTML.slice(0, 80)),
    );
    expect(tooSmall).toEqual([]);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the menu opens, traps focus and closes with Esc', async ({ page }) => {
    await page.goto('/design-system');
    await pageIsReady(page);
    const open = page.getByRole('button', { name: 'Open menu' });

    await open.click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
    await expect(open).toBeFocused();
  });

  test('a link in the menu closes it', async ({ page }) => {
    await page.goto('/design-system');
    await pageIsReady(page);

    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'Compare' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Compare' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  });
});
