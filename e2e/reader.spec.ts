import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    spokenTexts: string[];
    finishSpeaking: () => void;
  }
}

/** Headless Chrome has no voices, so this stands in for the speech engine. */
async function stubSpeech(page: Page) {
  await page.addInitScript(() => {
    let current: { onend?: () => void } | null = null;
    window.spokenTexts = [];
    window.finishSpeaking = () => {
      const utterance = current;
      current = null;
      utterance?.onend?.();
    };
    class FakeUtterance {
      rate = 1;
      lang = '';
      onend?: () => void;
      onerror?: () => void;
      constructor(public text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        cancel: () => {
          current = null;
        },
        speak: (utterance: FakeUtterance) => {
          current = utterance;
          window.spokenTexts.push(utterance.text);
        },
      },
    });
  });
}

const spokenCount = (page: Page) => page.evaluate(() => window.spokenTexts.length);

test.beforeEach(async ({ page }) => {
  await stubSpeech(page);
  await page.goto('/design-system');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('Listen reads the page block by block and highlights each one', async ({ page }) => {
  await page.getByRole('button', { name: 'Listen', exact: true }).click();

  const player = page.getByRole('region', { name: 'Read aloud player' });
  await expect(player).toContainText('Design system');
  await expect(player).toContainText(/part 1 of \d+/);
  await expect.poll(() => spokenCount(page)).toBe(1);

  const reading = page.locator('.reading');
  await expect(reading).toHaveCount(1);
  await expect(reading).toHaveClass(/badge/);
  const first = await reading.innerText();

  for (let part = 2; part <= 6; part += 1) {
    await page.evaluate(() => window.finishSpeaking());
    await expect(player).toContainText(`part ${part} of`);
    await expect.poll(() => spokenCount(page)).toBe(part);
    await expect(reading).toHaveCount(1);
    await expect(reading).toBeInViewport();
  }

  expect(await reading.innerText()).not.toBe(first);
  const spoken = await page.evaluate(() => window.spokenTexts);
  expect(new Set(spoken).size).toBe(spoken.length);
});

test('the highlight uses the yellow outline', async ({ page }) => {
  await page.getByRole('button', { name: 'Listen', exact: true }).click();

  await expect(page.locator('.reading')).toHaveCSS('outline-color', 'rgb(245, 158, 11)');
});

test('the prices and distances are read in words', async ({ page }) => {
  await page
    .getByRole('button', { name: 'Listen to details of Bright single room near campus' })
    .click();
  await expect.poll(() => spokenCount(page)).toBe(1);

  const [text] = await page.evaluate(() => window.spokenTexts);
  expect(text).toContain('85,000 Rwandan francs per month');
  expect(text).toContain('0.8 kilometres from U.R. C.S.T.');
  await expect(page.locator('.pcard.reading')).toHaveCount(1);
});

test('the player can pause, skip and stop', async ({ page }) => {
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect.poll(() => spokenCount(page)).toBe(1);

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();

  await page.getByRole('button', { name: 'Next part' }).click();
  await expect(page.getByRole('region', { name: 'Read aloud player' })).toContainText('part 2 of');

  await page.getByRole('button', { name: 'Stop reading' }).click();
  await expect(page.getByRole('region', { name: 'Read aloud player' })).toBeHidden();
  await expect(page.locator('.reading')).toHaveCount(0);
  await expect(page.getByText('Reading stopped.')).toBeVisible();
});

test('reading stops when the page changes', async ({ page }) => {
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Read aloud player' })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Compare' })
    .click();

  await expect(page.getByRole('region', { name: 'Read aloud player' })).toBeHidden();
});

test('Read what I tap reads plain text and leaves buttons alone', async ({ page }) => {
  await page.getByRole('button', { name: 'Display settings' }).click();
  await page
    .getByRole('radiogroup', { name: 'Read what I tap' })
    .getByRole('radio', { name: /^On/ })
    .click();
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'Show toast' }).click();
  await expect(page.getByRole('region', { name: 'Read aloud player' })).toBeHidden();

  await page.getByText('Foundations and components every screen is built from.').click();
  await expect.poll(() => spokenCount(page)).toBe(1);
  await expect(page.getByRole('region', { name: 'Read aloud player' })).toContainText(
    'What you tapped',
  );
});
