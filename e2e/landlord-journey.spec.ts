import { expect, test, type Page } from '@playwright/test';

// These tests write to the demo data. Run npm run db:reset to put it back.
const SMALLEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const DESCRIPTION = 'A bright single room in a quiet compound, ten minutes from campus.';

async function logInAsLandlord(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /Demo Landlord A/ }).click();
  await expect(page).toHaveURL(/\/landlord$/);
}

function uniqueTitle(label: string) {
  return `${label} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function fillBasicInfo(page: Page, title: string) {
  await page.getByLabel('Property title').fill(title);
  await page.getByRole('radio', { name: /Single room/ }).click();
  await page.getByLabel('Description').fill(DESCRIPTION);
}

const stepHeading = (page: Page, step: string) =>
  page.getByRole('heading', { level: 2, name: new RegExp(`^Step ${step}`) });

async function fillToReview(page: Page, title: string) {
  await page.goto('/landlord/properties/new');
  await fillBasicInfo(page, title);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(stepHeading(page, '2 of 5')).toBeVisible();

  await page.getByRole('radio', { name: /Kiyovu/ }).click();
  await page.getByLabel('Nearby landmark').fill('Kiyovu main road');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(stepHeading(page, '3 of 5')).toBeVisible();

  await page.getByLabel('Monthly rent (RWF)').fill('85000');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(stepHeading(page, '4 of 5')).toBeVisible();

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'at least one photo' })).toBeVisible();

  await page.locator('#wz-files').setInputFiles({
    name: 'room.png',
    mimeType: 'image/png',
    buffer: SMALLEST_PNG,
  });
  await expect(page.getByRole('button', { name: 'Remove photo 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(stepHeading(page, '5 of 5')).toBeVisible();
}

test('Journey B: add a listing, submit it, mark it occupied and undo', async ({ page }) => {
  await logInAsLandlord(page);
  const title = uniqueTitle('Journey room');

  await page.getByRole('link', { name: 'Add accommodation' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Add accommodation' })).toBeVisible();

  // The first step explains what is missing before anything moves on.
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'highlighted fields' })).toBeVisible();
  await expect(page.getByLabel('Property title')).toBeFocused();

  await fillToReview(page, title);

  await page.getByRole('button', { name: 'Preview as student' }).click();
  await expect(page.getByText('It is not visible to students yet.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

  await page.getByRole('link', { name: 'Return to editing' }).click();
  await expect(stepHeading(page, '5 of 5')).toBeVisible();

  await page.getByRole('button', { name: 'Submit Listing' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: /Submit/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your listing has been submitted for review.' }),
  ).toBeVisible();
  await expect(page.getByText(`${title} is now Pending review.`)).toBeVisible();

  await page.getByRole('link', { name: 'View my properties' }).click();
  await page.getByRole('button', { name: /^Pending review/ }).click();
  const row = page.locator('.list-item').filter({ hasText: title });
  await expect(row.getByText('Pending review')).toBeVisible();
  await expect(row.getByText('Available')).toBeVisible();

  await row.getByRole('button', { name: `Mark as occupied: ${title}` }).click();
  await expect(page.getByText(`${title} is now occupied.`)).toBeVisible();
  await expect(row.getByRole('button', { name: `Mark as available: ${title}` })).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Change undone.')).toBeVisible();
  await expect(row.getByRole('button', { name: `Mark as occupied: ${title}` })).toBeVisible();
});

test('refreshing keeps the draft, on the first step and later ones', async ({ page }) => {
  await logInAsLandlord(page);
  const title = uniqueTitle('Refreshed room');

  await page.goto('/landlord/properties/new');
  await page.getByLabel('Property title').pressSequentially(title);
  // Autosave must not take the cursor out of the field mid-word.
  await expect(page.getByLabel('Property title')).toBeFocused();
  await expect(page.locator('#autosave')).toContainText('Draft saved');

  await page.reload();
  await expect(page.getByLabel('Property title')).toHaveValue(title);

  await page.getByRole('radio', { name: /Single room/ }).click();
  await page.getByLabel('Description').fill(DESCRIPTION);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(stepHeading(page, '2 of 5')).toBeVisible();

  await page.getByLabel('Nearby landmark').fill('Near the market');
  // Refresh straight away, before the delayed autosave. The page sends the answer as it closes.
  await page.reload();
  await expect(async () => {
    await page.reload();
    await expect(stepHeading(page, '2 of 5')).toBeVisible();
    await expect(page.getByLabel('Nearby landmark')).toHaveValue('Near the market', {
      timeout: 500,
    });
  }).toPass({ timeout: 10_000 });

  await page.goto('/landlord/properties');
  const row = page.locator('.list-item').filter({ hasText: title });
  await expect(row.getByText('Draft')).toBeVisible();
  await row.getByRole('link', { name: `Continue with ${title}` }).click();
  await expect(page.getByLabel('Property title')).toHaveValue(title);
});

test('a deleted listing can be restored with Undo', async ({ page }) => {
  await logInAsLandlord(page);
  const title = uniqueTitle('Deleted room');

  await page.goto('/landlord/properties/new');
  await page.getByLabel('Property title').fill(title);
  await expect(page.locator('#autosave')).toContainText('Draft saved');

  await page.goto('/landlord/properties');
  const row = page.locator('.list-item').filter({ hasText: title });
  await row.getByRole('button', { name: `Delete ${title}` }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete listing' }).click();
  await expect(page.getByText('Listing deleted.')).toBeVisible();
  await expect(row).toHaveCount(0);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Listing restored.')).toBeVisible();
  await expect(row).toHaveCount(1);
});

test('a landlord replies to an inquiry and it is marked as handled', async ({ page }) => {
  await logInAsLandlord(page);
  await page.goto('/landlord/inquiries');
  await page.getByRole('button', { name: /^New/ }).click();

  await page.locator('.list-item.clickable').first().click();
  const reply = page.getByLabel('Reply');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await expect(reply).toHaveAttribute('aria-invalid', 'true');

  await reply.fill('Yes, the room is available. You can visit on Saturday.');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await expect(page.getByText('Reply sent and marked as handled.')).toBeVisible();
  await expect(
    page.locator('.bubble.out').filter({ hasText: 'You can visit on Saturday' }),
  ).toBeVisible();
});

test('the last contact method cannot be turned off', async ({ page }) => {
  await logInAsLandlord(page);
  await page.goto('/landlord/account');

  const phone = page.getByRole('switch', { name: 'Phone calls' });
  const whatsapp = page.getByRole('switch', { name: 'WhatsApp' });
  const inApp = page.getByRole('switch', { name: 'In-app messages' });
  const turn = async (control: typeof phone, on: boolean) => {
    await expect(control).toBeEnabled();
    if ((await control.isChecked()) !== on) await control.click();
    await expect(control).toBeChecked({ checked: on });
  };

  await turn(whatsapp, false);
  await turn(inApp, false);
  await phone.click();
  await expect(
    page.getByText('Keep at least one contact method on so students can reach you.'),
  ).toBeVisible();
  await expect(phone).toBeChecked();

  await turn(whatsapp, true);
  await turn(inApp, true);
});
