import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { logIn } from './helpers';

async function seriousProblems(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(({ id, nodes }) => `${id}: ${nodes.map(({ target }) => target.join(' ')).join(', ')}`);
}

const choose = (lang: string) => (page: Page) =>
  page.addInitScript(
    (value) => localStorage.setItem('urcst-prefs', JSON.stringify({ lang: value })),
    lang,
  );

test('a guest switches to French from the header, and it stays after a reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Language/ }).click();
  await page.getByRole('radio', { name: 'Français' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Trouvez votre prochain logement',
  );
  await expect(page.getByText('Langue : Français.')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Trouvez votre prochain logement',
  );
  await expect(page).toHaveTitle(/UR-CST Logement étudiant/);

  // And back to English.
  await page.getByRole('button', { name: /^Langue/ }).click();
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find Your Next Home');
});

test('messages from the server arrive in the chosen language', async ({ page }) => {
  await choose('rw')(page);
  await page.goto('/login');
  await page.getByLabel('Aderesi ya imeri').fill('student@demo.ur');
  await page.getByLabel("Ijambo ry'ibanga", { exact: true }).fill('wrong-password');
  await page.locator('form').getByRole('button', { name: 'Injira' }).click();
  await expect(page.getByText("Imeri cyangwa ijambo ry'ibanga si byo.").first()).toBeVisible();
});

test('an administrator changes language from the display settings', async ({ page }) => {
  await page.goto('/login');
  await logIn(page, 'admin@demo.ur');
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByRole('button', { name: 'Display', exact: true }).click();
  await page
    .getByRole('radiogroup', { name: 'Language' })
    .getByRole('radio', { name: 'Kinyarwanda' })
    .click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 1, name: "Ikibaho cy'umuyobozi" })).toBeVisible();
  await expect(page.getByRole('link', { name: /Isuzuma ry'amatangazo/ })).toBeVisible();

  await page.goto('/admin/review');
  await expect(
    page.getByRole('heading', { level: 1, name: "Isuzuma ry'amatangazo" }),
  ).toBeVisible();
});

for (const lang of ['rw', 'fr']) {
  test(`signed-in pages have no serious accessibility problems in ${lang}`, async ({ page }) => {
    test.setTimeout(120_000);
    await choose(lang)(page);
    const visit = async (path: string) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      expect(await seriousProblems(page), `${lang} ${path}`).toEqual([]);
    };

    for (const [email, paths] of [
      ['student@demo.ur', ['/student', '/search', '/properties/p1', '/saved', '/account']],
      ['landlord@demo.ur', ['/landlord', '/landlord/properties', '/landlord/inquiries']],
      ['admin@demo.ur', ['/admin', '/admin/review', '/admin/reports', '/admin/locations']],
    ] as const) {
      await page.context().clearCookies();
      await page.goto('/login');
      await page.locator('main input[type=email]').fill(email);
      await page.locator('main input[type=password]').fill('demo1234');
      await page.locator('main form button[type=submit]').click();
      await expect(page).not.toHaveURL(/\/login/);
      for (const path of paths) await visit(path);
    }
  });
}
