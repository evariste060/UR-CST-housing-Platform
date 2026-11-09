import { expect, test, type Page } from '@playwright/test';
import { logIn } from './helpers';

// These tests use the seeded demo data. Run npm run db:reset if the data has changed.
async function logInAsStudent(page: Page) {
  await page.goto('/login');
  await logIn(page, 'student@demo.ur');
  await expect(page).toHaveURL(/\/student$/);
}

test('Journey A: find a room, save it, compare it and message the landlord', async ({ page }) => {
  await logInAsStudent(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'Find Housing' }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Find accommodation near UR-CST' }),
  ).toBeVisible();

  const filters = page.getByRole('complementary', { name: 'Filters' });
  await filters.getByRole('radio', { name: 'Up to 100,000' }).click();
  await filters.getByRole('radio', { name: 'Within 2 km' }).click();
  await filters.getByRole('checkbox', { name: 'Single room' }).click();
  await filters.getByRole('button', { name: 'Apply Filters' }).click();
  await expect(page).toHaveURL(/maxRent=100000/);
  await expect(page).toHaveURL(/maxDistance=2/);
  await expect(page).toHaveURL(/types=SINGLE/);

  await expect(page.locator('#res-count')).toContainText(/match/);
  const cards = page.getByRole('article');
  await expect(cards.nth(1)).toBeVisible();

  // A second listing goes into compare first, so the first can join it from its own page.
  await cards.nth(1).getByRole('button', { name: 'Compare' }).click();
  await expect(page.getByText('Added to compare (1 of 4).')).toBeVisible();
  const first = cards.first();
  const title = (await first.getAttribute('aria-label')) ?? '';
  await first.getByRole('link', { name: title, exact: true }).click();

  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Facilities' })).toBeVisible();
  await expect(page.locator('.gallery-main img')).toBeVisible();

  const panel = page.locator('#sec-price');
  const remove = panel.getByRole('button', { name: `Saved: ${title}` });
  if (await remove.isVisible()) await remove.click();
  await panel.getByRole('button', { name: `Save property: ${title}` }).click();
  await expect(
    page.getByText('Saved to your list. This does not reserve the room.').last(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Add to compare' }).click();
  await page.getByRole('link', { name: 'Compare now' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Compare properties' })).toBeVisible();
  await expect(page.getByRole('rowheader', { name: 'Monthly rent' })).toBeVisible();

  await page.getByRole('link', { name: `Contact the landlord of ${title}` }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Contact landlord' })).toBeVisible();
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible();
  await page.getByRole('link', { name: 'View my inquiries' }).click();
  await page
    .locator('a.mini')
    .filter({ hasText: 'You:' })
    .filter({ hasText: title })
    .first()
    .click();
  await expect(page).toHaveURL(/\/student\/inquiries\?open=/);
  await expect(page.locator('.thread .bubble.out').first()).toContainText('Is it still available?');
});

test('a guest who saves a room finds it in their account after logging in', async ({ page }) => {
  await page.goto('/search');
  const card = page.getByRole('article').last();
  await expect(card).toBeVisible();
  const title = (await card.getAttribute('aria-label')) ?? '';
  await card.getByRole('button', { name: `Save ${title}` }).click();
  await expect(page.getByRole('link', { name: 'Saved Properties 1' })).toBeVisible();

  await logInAsStudent(page);
  await page.goto('/saved');

  await expect(page.getByRole('link', { name: title }).first()).toBeVisible();
});

test('a guest who asks to message a landlord comes back after logging in', async ({ page }) => {
  await page.goto('/search');
  await page.getByRole('article').first().getByRole('link', { name: 'View details' }).click();
  await page
    .locator('#sec-price')
    .getByRole('link', { name: /Contact landlord|Ask about/ })
    .click();
  await page.locator('main').getByRole('link', { name: 'Log in', exact: true }).click();

  await logIn(page, 'student@demo.ur');

  await expect(page).toHaveURL(/\/contact/);
  await expect(page.getByLabel('Your message')).toBeVisible();
});

test('the empty state buttons change the results', async ({ page }) => {
  await page.goto('/search?maxRent=30000&maxDistance=1');
  await expect(page.getByText('No accommodation matches your search.')).toBeVisible();

  await page.getByRole('button', { name: 'Increase budget to 60,000 RWF' }).click();
  await expect(page).toHaveURL(/maxRent=60000/);
  await expect(page.getByText('Budget increased to 60,000 RWF.')).toBeVisible();

  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await expect(page.locator('#res-count')).toHaveText('11 places match your search');
});

test('filters wait for Apply and Reset clears them', async ({ page }) => {
  await page.goto('/search');
  const filters = page.getByRole('complementary', { name: 'Filters' });
  const single = filters.getByRole('checkbox', { name: 'Single room' });

  await single.check();
  await expect(page).not.toHaveURL(/types=/);
  await filters.getByRole('button', { name: 'Apply Filters' }).click();
  await expect(page).toHaveURL(/types=SINGLE/);

  await filters.getByRole('button', { name: 'Reset' }).click();
  await expect(page).not.toHaveURL(/types=/);
  await expect(single).not.toBeChecked();
});

test('the sort menu opens on hover and on click', async ({ page }) => {
  await page.goto('/search');
  const sort = page.getByRole('button', { name: 'Sort: Recommended' });
  const lowest = page.getByRole('radio', { name: 'Lowest price' });

  await sort.hover();
  await expect(lowest).toBeVisible();
  await lowest.click();
  await expect(page).toHaveURL(/sort=price-asc/);
  const changed = page.getByRole('button', { name: 'Sort: Lowest price' });
  await expect(changed).toBeFocused();
  await expect(lowest).toBeHidden();

  await page.mouse.move(0, 0);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('radio', { name: 'Closest' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('radio', { name: 'Closest' })).toBeHidden();
  await expect(changed).toBeFocused();
});

test('the student sidebar reaches each page and logs out', async ({ page }) => {
  await logInAsStudent(page);
  const side = page.getByRole('navigation', { name: 'Student navigation' });

  for (const [link, path] of [
    ['Profile', /\/account$/],
    ['Notifications', /\/notifications$/],
    ['My inquiries', /\/student\/inquiries$/],
    ['Saved properties', /\/saved$/],
    ['Dashboard', /\/student$/],
  ] as const) {
    await side.getByRole('link', { name: link }).click();
    await expect(page).toHaveURL(path);
    await expect(side.getByRole('link', { name: link })).toHaveAttribute('aria-current', 'page');
  }

  await page.goto('/search');
  await expect(side).toBeHidden();
  await page.goto('/student');
  await side.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('on a phone the student sidebar is a toolbar of icons at the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await logInAsStudent(page);
  const bar = page.getByRole('navigation', { name: 'Student navigation' });

  const box = await bar.boundingBox();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBe(844);
  await expect(bar.getByRole('link')).toHaveCount(5);
  await expect(bar.getByRole('button', { name: 'Log out' })).toBeHidden();

  const inquiries = bar.getByRole('link', { name: 'My inquiries' });
  expect((await inquiries.locator('span').boundingBox())?.width).toBeLessThanOrEqual(1);
  await inquiries.click();
  await expect(page).toHaveURL(/\/student\/inquiries$/);
  await expect(inquiries).toHaveAttribute('aria-current', 'page');
});

test('filters chosen in quick succession are all kept', async ({ page }) => {
  await page.goto('/search');
  const filters = page.getByRole('complementary', { name: 'Filters' });
  const rent = await filters.getByRole('radio', { name: 'Up to 100,000' }).elementHandle();
  const distance = await filters.getByRole('radio', { name: 'Within 2 km' }).elementHandle();

  // Both clicks land before the page has redrawn, as they can on a slow phone.
  await page.evaluate(
    ([first, second]) => {
      (first as HTMLElement).click();
      (second as HTMLElement).click();
    },
    [rent, distance],
  );
  await filters.getByRole('button', { name: 'Apply Filters' }).click();

  await expect(page).toHaveURL(/maxRent=100000/);
  await expect(page).toHaveURL(/maxDistance=2/);
});
