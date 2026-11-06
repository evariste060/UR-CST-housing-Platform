import { expect, test } from '@playwright/test';

test('the web app reaches the API', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.ok()).toBe(true);
});
