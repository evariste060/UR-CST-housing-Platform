import { expect, test, type Page } from '@playwright/test';
import { logIn } from './helpers';

// Demo Landlord B's listing, so this does not race the landlord journey, which uses Landlord A.
const TITLE = 'Muhima Shared Student House';

async function signIn(page: Page, email: string, home: RegExp) {
  await page.goto('/login');
  await logIn(page, email);
  await expect(page).toHaveURL(home);
}

function bell(page: Page) {
  return page.getByRole('banner').getByRole('button', { name: /^Notifications/ });
}

test('an inquiry and its reply arrive as notifications that open the conversation', async ({
  browser,
}) => {
  const visit = `Could I visit on day ${Date.now()}?`;
  const answer = `Yes, come at ${Date.now()}.`;

  // The student asks about the room.
  const student = await (await browser.newContext()).newPage();
  await signIn(student, 'student@demo.ur', /\/student$/);
  await student.goto('/properties/p2/contact');
  await student.getByLabel('Your message').fill(visit);
  await student.getByRole('button', { name: 'Send message' }).click();
  await expect(student.getByRole('heading', { name: 'Message sent' })).toBeVisible();

  // The landlord's bell shows it, and opening it goes straight to that conversation.
  const landlord = await (await browser.newContext()).newPage();
  await signIn(landlord, 'landlord.b@demo.ur', /\/landlord$/);
  await expect(bell(landlord)).toHaveAccessibleName(/^Notifications, \d+ unread$/);
  await bell(landlord).click();
  const menu = landlord.getByRole('group', { name: 'Notifications' });
  await menu
    .getByRole('link', { name: new RegExp(`sent an inquiry about ${TITLE}`) })
    .first()
    .click();
  await expect(landlord).toHaveURL(/\/landlord\/inquiries\?open=/);
  await expect(landlord.locator('.bubble').filter({ hasText: visit })).toBeVisible();
  await landlord.getByLabel('Reply', { exact: true }).fill(answer);
  await landlord.getByRole('button', { name: 'Send reply' }).click();
  await expect(landlord.getByText('Reply sent and marked as handled.')).toBeVisible();

  // The student hears about the reply and it opens the thread.
  await student.goto('/student');
  await bell(student).click();
  await student
    .getByRole('group', { name: 'Notifications' })
    .getByRole('link', { name: new RegExp(`replied to your inquiry about ${TITLE}`) })
    .first()
    .click();
  await expect(student).toHaveURL(/\/student\/inquiries\?open=/);
  await expect(student.locator('.thread .bubble.in').last()).toContainText(answer);

  // Everything can be marked read from the Notifications page.
  await student.goto('/notifications');
  await expect(student.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
  await expect(student.locator('.notif').first()).toBeVisible();
  const markAll = student.getByRole('button', { name: 'Mark all as read' });
  if (await markAll.isVisible()) {
    await markAll.click();
    await expect(student.getByText('All notifications marked as read.')).toBeVisible();
  }
  await expect(student.getByText("You're all caught up.", { exact: false })).toBeVisible();
  await expect(student.locator('.notif.unread')).toHaveCount(0);
  await expect(bell(student)).toHaveAccessibleName('Notifications');
});

test('a guest is asked to log in to see notifications', async ({ page }) => {
  await page.goto('/notifications');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Log in to see your notifications' }),
  ).toBeVisible();
});

test('help answers questions, jumps to a topic and sends a support message', async ({ page }) => {
  await page.goto('/help');
  await expect(page.getByRole('heading', { level: 1, name: 'Help & support' })).toBeVisible();

  await page.getByText('Does saving reserve the room?').click();
  await expect(page.getByText('No. Saving only keeps the property on your list.')).toBeVisible();

  await page
    .getByRole('navigation', { name: 'On this page' })
    .getByRole('button', { name: 'Contact support' })
    .click();
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Please enter your full name.')).toBeVisible();
  await expect(page.getByText('Please choose a topic.')).toBeVisible();

  await page.getByLabel('Your name').fill('Aline K.');
  await page.getByLabel('Email address').fill('aline@example.com');
  await page.getByRole('radio', { name: 'Searching for rooms' }).click();
  await expect(page.getByText('Selected: Searching for rooms')).toBeVisible();
  await page.getByLabel('Message').fill('The distance filter does not change my results.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Your message was sent to the support team.')).toBeVisible();
});

test('"How publishing works" opens the publishing answers', async ({ page }) => {
  await page.goto('/help#publishing');
  await expect(
    page.getByRole('heading', { level: 2, name: 'Publishing a property' }),
  ).toBeInViewport();
});

test('system states buttons give feedback', async ({ page }) => {
  await page.goto('/states');
  await expect(page.getByRole('heading', { level: 1, name: 'System states' })).toBeVisible();
  await page.getByRole('button', { name: 'Property saved' }).click();
  await expect(page.getByText('Saved to your list. This does not reserve the room.')).toBeVisible();
  await page.getByRole('button', { name: 'Deletion confirmation' }).click();
  await page.getByRole('button', { name: 'Delete listing' }).click();
  await expect(
    page.getByText('Example listing deleted. Nothing was really removed.'),
  ).toBeVisible();
});
