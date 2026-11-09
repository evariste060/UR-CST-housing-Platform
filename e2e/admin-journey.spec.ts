import { expect, test, type Page } from '@playwright/test';
import { logIn } from './helpers';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function signIn(page: Page, email: string, home: RegExp) {
  await page.goto('/login');
  await logIn(page, email);
  await expect(page).toHaveURL(home);
}

/** A fresh pending listing from Demo Landlord B, so the journey never runs out of demo data. */
async function submitListing(page: Page, title: string) {
  await signIn(page, 'landlord.b@demo.ur', /\/landlord$/);
  const created = await page.request.post('/api/landlord/properties', {
    data: {
      title,
      type: 'SINGLE',
      rooms: 1,
      description:
        'A bright single room near campus. Water and electricity are included in the rent.',
      landmark: 'Near the market',
      rentRwf: 70000,
      availability: 'AVAILABLE',
    },
  });
  const { id } = (await created.json()) as { id: string };
  const locations = (await (await page.request.get('/api/locations')).json()) as {
    items: { id: string }[];
  };
  await page.request.patch(`/api/landlord/properties/${id}`, {
    data: { locationId: locations.items[0]!.id },
  });
  await page.request.post(`/api/landlord/properties/${id}/photos`, {
    multipart: { photos: { name: 'room.png', mimeType: 'image/png', buffer: PNG } },
  });
  const submitted = await page.request.post(`/api/landlord/properties/${id}/submit`);
  expect(submitted.ok()).toBe(true);
  return id;
}

test('Journey C: an administrator approves a listing, students find it, and a report is resolved', async ({
  browser,
}) => {
  const title = `Journey C Room ${Date.now()}`;
  const landlord = await (await browser.newContext()).newPage();
  await submitListing(landlord, title);

  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, 'admin@demo.ur', /\/admin$/);
  await expect(
    admin.getByRole('heading', { level: 1, name: 'Administrator dashboard' }),
  ).toBeVisible();

  await admin.getByRole('link', { name: /^Pending reviews/ }).click();
  await expect(admin).toHaveURL(/\/admin\/review$/);
  await admin.getByRole('link', { name: `View details of ${title}` }).click();
  await expect(admin.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(admin.getByRole('heading', { name: 'Review checklist' })).toBeVisible();

  await admin.getByRole('button', { name: 'Approve listing' }).click();
  await admin.getByRole('alertdialog').getByRole('button', { name: 'Approve listing' }).click();
  await expect(admin.getByText('Listing approved. Students can see it now.')).toBeVisible();
  await expect(admin.getByRole('link', { name: 'Open student view' })).toBeVisible();

  // A student searching straight away finds it.
  const student = await (await browser.newContext()).newPage();
  await student.goto(`/search?q=${encodeURIComponent(title)}`);
  await expect(student.getByRole('article', { name: title })).toBeVisible();

  // The landlord is told.
  await landlord.goto('/notifications');
  await expect(
    landlord.getByRole('link', { name: new RegExp(`Listing approved: ${title}`) }),
  ).toBeVisible();

  // A report about it is opened and resolved.
  const id = new URL(admin.url()).pathname.split('/').pop()!;
  const reported = await student.request.post(`/api/properties/${id}/reports`, {
    data: { reason: 'WRONG_INFORMATION', details: 'The rent is different.' },
  });
  expect(reported.ok()).toBe(true);
  await admin.goto('/admin/reports');
  await admin
    .getByRole('button', { name: `View report on ${title}` })
    .first()
    .click();
  await expect(admin.getByText('The rent is different.')).toBeVisible();
  await admin.getByRole('button', { name: 'Close' }).last().click();
  await admin
    .getByRole('button', { name: `Resolve the report on ${title}` })
    .first()
    .click();
  const dialog = admin.getByRole('alertdialog');
  await dialog.getByRole('button', { name: 'Resolve report' }).click();
  await expect(dialog.getByText('Please add a short note.')).toBeVisible();
  await dialog.getByLabel(/Resolution note/).fill('Landlord confirmed the rent.');
  await dialog.getByRole('button', { name: 'Resolve report' }).click();
  await expect(admin.getByText('Report resolved.')).toBeVisible();
  await admin.getByRole('button', { name: /^Resolved/ }).click();
  await expect(admin.getByText(title).first()).toBeVisible();

  // Keep the demo search tidy for the next run.
  expect((await landlord.request.delete(`/api/landlord/properties/${id}`)).ok()).toBe(true);
});

test('a removed listing disappears from search and from saved lists', async ({ browser }) => {
  const title = `Removed Room ${Date.now()}`;
  const landlord = await (await browser.newContext()).newPage();
  const id = await submitListing(landlord, title);

  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, 'admin@demo.ur', /\/admin$/);
  expect((await admin.request.post(`/api/admin/listings/${id}/approve`)).ok()).toBe(true);

  const student = await (await browser.newContext()).newPage();
  await signIn(student, 'student@demo.ur', /\/student$/);
  expect((await student.request.post(`/api/me/saved/${id}`)).ok()).toBe(true);

  await admin.goto(`/admin/review/${id}`);
  await admin.getByRole('button', { name: 'Remove listing' }).click();
  const dialog = admin.getByRole('alertdialog');
  await dialog.getByLabel(/Reason/).fill('The room was found to be already let.');
  await dialog.getByRole('button', { name: 'Remove listing' }).click();
  await expect(admin.getByText('Listing removed. The landlord has been notified.')).toBeVisible();

  await student.goto(`/search?q=${encodeURIComponent(title)}`);
  await expect(student.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(student.getByRole('article', { name: title })).toHaveCount(0);
  const saved = (await (await student.request.get('/api/me/saved/ids')).json()) as {
    ids: string[];
  };
  expect(saved.ids).not.toContain(id);
  await landlord.request.delete(`/api/landlord/properties/${id}`);
});

test('changes requested need a note, and the landlord sees it', async ({ browser }) => {
  const title = `Changes Room ${Date.now()}`;
  const landlord = await (await browser.newContext()).newPage();
  const id = await submitListing(landlord, title);

  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, 'admin@demo.ur', /\/admin$/);
  await admin.goto('/admin/review');
  await admin.getByRole('button', { name: `Request changes to ${title}` }).click();
  const dialog = admin.getByRole('alertdialog');
  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(dialog.getByText('Please write a short note for the landlord.')).toBeVisible();
  await dialog.getByLabel(/What should the landlord change/).fill('Please add a bathroom photo.');
  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(admin.getByText('Changes requested. The landlord has been notified.')).toBeVisible();

  const rows = (await (
    await landlord.request.get(`/api/landlord/properties?q=${encodeURIComponent(title)}`)
  ).json()) as { items: { id: string; reviewNote: string | null; reviewStatus: string }[] };
  expect(rows.items.find((row) => row.id === id)).toMatchObject({
    reviewStatus: 'CHANGES_REQUESTED',
    reviewNote: 'Please add a bathroom photo.',
  });
  await landlord.request.delete(`/api/landlord/properties/${id}`);
});

test('users can be suspended and reactivated, and locations managed', async ({ page }) => {
  await signIn(page, 'admin@demo.ur', /\/admin$/);
  await page.goto('/admin/users');
  await page.getByLabel('Search users').fill('samuel');
  await page.getByRole('button', { name: /^Suspend Samuel/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Suspend account' }).click();
  await expect(page.getByText('Account suspended.')).toBeVisible();
  await page.getByRole('button', { name: /^Reactivate Samuel/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reactivate account' }).click();
  await expect(page.getByText('Account reactivated.')).toBeVisible();

  const name = `Testville ${Date.now() % 100000}`;
  await page.goto('/admin/locations');
  await page.getByRole('button', { name: 'Add location' }).click();
  const form = page.getByRole('dialog', { name: 'Add location' });
  await form.getByLabel(/Location name/).fill(name);
  await form.getByLabel(/Approximate distance/).fill('9');
  await form.getByRole('button', { name: 'Add location' }).click();
  await expect(
    form.getByText('Enter a distance between 0.1 and 5 km (the pilot area).'),
  ).toBeVisible();
  await form.getByLabel(/Approximate distance/).fill('2.4');
  await form.getByRole('button', { name: 'Add location' }).click();
  await expect(page.getByText(`${name} added.`)).toBeVisible();

  await page.getByLabel('Search locations').fill(name);
  await page.getByRole('button', { name: `Remove ${name}` }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove location' }).click();
  await expect(page.getByText(`${name} removed.`)).toBeVisible();
  await expect(page.getByText('No locations match')).toBeVisible();

  // A neighbourhood with listings cannot be removed.
  await page.getByLabel('Search locations').fill('Kiyovu');
  await page.getByRole('button', { name: 'Remove Kiyovu' }).click();
  await expect(page.getByRole('dialog', { name: 'Kiyovu is still in use' })).toBeVisible();
});
