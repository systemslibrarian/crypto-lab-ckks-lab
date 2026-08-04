import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { auditContrast, formatContrastFailures } from './contrast';

/**
 * WCAG regression gate.
 *
 * Two things this file deliberately does NOT do, both of which it used to:
 *
 * 1. It does not scan straight after `page.goto` and stop there. Every exhibit
 *    on this page is inert until its buttons are pressed — the modulus chain has
 *    no current level, the SIMD lanes are empty, the network has no active
 *    edges, the precision meter has no reading, and the depth-exhaustion refusal
 *    does not exist at all. Scanning only the untouched page checked almost none
 *    of the UI, and it hid a real AA contrast failure on the highlighted modulus
 *    chip. Each scan below drives the page into a named state first.
 *
 * 2. It does not inject `animation: none; transition: none`. While that
 *    injection was present the suite was structurally unable to observe a
 *    transition or theme-swap defect, because it had deleted the thing it was
 *    meant to be checking. (It was also aimed at `.panel` / `[hidden]` /
 *    `.is-hidden`, none of which this lab has, so it neutralised nothing while
 *    still advertising that motion had been handled.)
 *
 *    Motion is settled honestly instead: `page.emulateMedia({ reducedMotion:
 *    'reduce' })` plus a poll until `getAnimations()` reports nothing running.
 *    That is a real assertion here, not a formality — `.net-edge.on` in exhibit
 *    4 carries `animation: net-flow 1s linear infinite`, so the poll can only
 *    ever drain because the stylesheet's own `prefers-reduced-motion` block
 *    switches it off. If that block regresses, this gate hangs and fails.
 *
 *    `test.use({ reducedMotion: 'reduce' })` is NOT equivalent — on Playwright
 *    1.61.1 it silently does nothing, at file level and inside `test.describe`,
 *    and the page still reports `matches === false`. Hence `emulateMedia` plus
 *    `assertReducedMotion`.
 *
 * Contrast is additionally measured arithmetically in `./contrast`, because axe
 * is not a complete contrast oracle: it declines to compute a ratio over a
 * gradient, and it does not reliably enumerate every failing node.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Fail loudly if reduced motion is not actually in effect. */
async function assertReducedMotion(page: Page): Promise<void> {
  const matches = await page.evaluate(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  expect(
    matches,
    'reduced motion is not in effect — page.emulateMedia is the only form that works here'
  ).toBe(true);
}

/** Poll until no animation is running, rather than deleting animations. */
async function settle(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      document.getAnimations().every((a) => a.playState === 'finished' || a.playState === 'idle'),
    undefined,
    { timeout: 15_000 }
  );
}

/**
 * Guard against scanning a state that never actually rendered. Each scan names
 * the content it believes it is looking at, so a missing panel fails here
 * instead of quietly producing a clean axe run over nothing.
 */
async function expectRendered(page: Page, selectors: string[]): Promise<void> {
  for (const sel of selectors) {
    const locator = page.locator(sel).first();
    await expect(locator, `expected content at ${sel}`).toBeVisible();
    const text = (await locator.innerText()).trim();
    expect(text.length, `expected non-empty content at ${sel}`).toBeGreaterThan(0);
  }
}

async function open(page: Page, theme: 'dark' | 'light'): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('.');
  await assertReducedMotion(page);
  if (theme === 'light') {
    await page.locator('#cl-theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  }
  // #app ships empty and is filled by the module script; wait for real content.
  await expectRendered(page, ['.cl-hero-title', '[data-e3-modchain]', '[data-e5-log]']);
  // The "go deeper" material lives in <details>; scan it too.
  await page.evaluate(() => {
    for (const d of Array.from(document.querySelectorAll('details'))) {
      (d as HTMLDetailsElement).open = true;
    }
  });
  await settle(page);
}

async function scan(page: Page, label: string): Promise<void> {
  await settle(page);

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
  }));
  expect(summary, `axe violations in state: ${label}`).toEqual([]);

  const failures = await auditContrast(page);
  expect(
    formatContrastFailures(failures),
    `measured contrast failures in state: ${label}`
  ).toEqual([]);
}

for (const theme of ['dark', 'light'] as const) {
  test(`no WCAG A/AA violations on first paint (${theme})`, async ({ page }) => {
    await open(page, theme);
    await scan(page, `${theme} / initial`);
  });

  test(`no WCAG A/AA violations in exhibits 1 and 2 (${theme})`, async ({ page }) => {
    await open(page, theme);

    await page.locator('[data-e1-run]').click();
    await expect(page.locator('[data-e1-out]')).toContainText('decrypt');

    await page.locator('[data-e2-encode]').click();
    await page.locator('[data-e2-enc-a]').click();
    await page.locator('[data-e2-enc-b]').click();
    await page.locator('[data-e2-add]').click();
    await page.locator('[data-e2-dec]').click();
    await expect(page.locator('[data-e2-out]')).toContainText('Per-slot error');
    await scan(page, `${theme} / exhibit 2 decrypted`);

    // Tampering rewrites the ciphertext view and the drift note. Both are
    // states that only exist after input.
    await page.locator('[data-e2-tamper]').click();
    await expect(page.locator('[data-e2-tamper-out]')).toContainText('Nudged coefficient');
    await scan(page, `${theme} / exhibit 2 tampered`);
  });

  test(`no WCAG A/AA violations across the exhibit 3 pipeline (${theme})`, async ({ page }) => {
    await open(page, theme);

    await page.locator('[data-e3-enc]').click();
    // Encrypting is what first marks a modulus chip .current — that chip repaints
    // its fill from --panel to --green-soft, and its labels have to follow.
    await expect(page.locator('.mod-chip.current')).toBeVisible();
    await scan(page, `${theme} / exhibit 3 encrypted`);

    await page.locator('[data-e3-mul]').click();
    // Multiply narrates two stages: a transient degree-2 ciphertext, then a
    // relinearized pair 900ms later. Scan both — the transient one is a rendered
    // state a user genuinely sees.
    await expect(page.locator('[data-e3-c2]')).toHaveClass(/show/);
    await scan(page, `${theme} / exhibit 3 degree-2 transient`);

    await expect(page.locator('[data-e3-status]')).toContainText('Relinearized', {
      timeout: 5_000,
    });
    await expect(page.locator('[data-e3-c2]')).not.toHaveClass(/show/);
    await scan(page, `${theme} / exhibit 3 relinearized`);

    await page.locator('[data-e3-rescale]').click();
    await expect(page.locator('[data-e3-out]')).toContainText('RESCALE');
    await page.locator('[data-e3-dec]').click();
    await scan(page, `${theme} / exhibit 3 rescaled and decrypted`);
  });

  test(`no WCAG A/AA violations in the encrypted inference network (${theme})`, async ({
    page,
  }) => {
    await open(page, theme);

    await page.locator('[data-e4-plain]').click();
    await page.locator('[data-e4-enc]').click();
    await page.locator('[data-e4-run]').click();
    // Every edge is now .on, which is the infinite-animation state. settle()
    // inside scan() can only pass because reduced motion disables it.
    await expect(page.locator('.net-edge.on').first()).toBeVisible();
    await scan(page, `${theme} / exhibit 4 forward pass running`);

    await page.locator('[data-e4-dec]').click();
    await expect(page.locator('.net-node.decrypted')).toBeVisible();
    await scan(page, `${theme} / exhibit 4 decrypted`);
  });

  test(`no WCAG A/AA violations as precision degrades to the depth wall (${theme})`, async ({
    page,
  }) => {
    await open(page, theme);

    await page.locator('[data-e5-reset]').click();
    await page.locator('[data-e5-add]').click();
    await expect(page.locator('[data-e5-log]')).toContainText('After add');

    // Walk the precision meter down through good -> warn -> bad, then past the
    // wall. The refusal message is a rendered error state that exists nowhere
    // else, and each meter health band recolours the readout.
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-e5-mul]').click();
    }
    await expect(page.locator('[data-e5-log]')).toContainText('Depth budget exhausted');
    await scan(page, `${theme} / exhibit 5 depth exhausted`);
  });
}
