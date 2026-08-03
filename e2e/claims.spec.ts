import { expect, test, type Page } from '@playwright/test';

/**
 * Claims gate. The a11y suite proves the page is reachable; this suite proves the
 * numbers on it are true. The README's central promise is that the crypto is real
 * — "no displayed decrypted result is ever read from a plaintext cache" — so most
 * of what follows re-derives each displayed value from the page's own other
 * outputs, and drives the tamper / depth-exhaustion / wrong-order paths to the
 * states the lab says they reach.
 *
 * Encryption draws fresh randomness per call, so exact ciphertext values are
 * never asserted; what is asserted is the arithmetic that must hold over them
 * (deltas, sums, drifts, digit counts) and the approximation bounds the lab
 * advertises for its toy Δ = 2^10.
 */

const DELTA = 1024; // the lab's toy scale, printed on the page as Δ=1024

function nums(text: string): number[] {
  return (text.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
}

/** Parse a "[1.000000, 2.000000]" vector out of a line of output. */
function vec(text: string, label: string): number[] {
  const m = new RegExp(`${label}\\s*\\[([^\\]]+)\\]`).exec(text);
  expect(m, `no "${label} [...]" in: ${text}`).not.toBeNull();
  return m![1]!.split(',').map((v) => Number(v.trim()));
}

async function boxes(page: Page, row: number): Promise<string[]> {
  return page.locator('[data-e2-encflow] .encrow').nth(row).locator('.cbox').allTextContents();
}

// ─── Exhibit 1 — the first-try round trip ────────────────────────────────────

test('exhibit 1: the round trip returns the number, and reports its own approximation gap', async ({ page }) => {
  await page.goto('.');
  const out = page.locator('[data-e1-out]');
  await page.locator('[data-e1-run]').click();

  // "encrypt 3.14, get 3.1401 back" — the README's opening promise.
  const recovered = Number(await out.locator('.e1-chip.out').textContent());
  expect(recovered).toBeGreaterThan(3.1);
  expect(recovered).toBeLessThan(3.18);

  // The stated gap must be the gap between the two numbers on screen, not a
  // decorative constant. The chip is rounded to 4dp, so allow that much slack.
  const note = (await out.locator('.e1-note').textContent())!;
  const claimed = Number(/Off by ([\d.e+-]+)/.exec(note)![1]);
  expect(Math.abs(claimed - Math.abs(recovered - 3.14))).toBeLessThan(1e-4);
  expect(claimed).toBeGreaterThan(0); // approximate, by design — never exact
  expect(claimed).toBeLessThan(0.01);
  expect(note).toContain('deliberate approximation');

  // A different value round-trips too (the engine is not pinned to 3.14).
  await page.locator('#e1-value').fill('-2.5');
  await page.locator('[data-e1-run]').click();
  const second = Number(await out.locator('.e1-chip.out').textContent());
  expect(Math.abs(second - -2.5)).toBeLessThan(0.01);

  // Non-numeric input is refused rather than silently encrypting NaN.
  await page.locator('#e1-value').fill('not a number');
  await page.locator('[data-e1-run]').click();
  await expect(out).toHaveText('Enter a single real number (e.g. 3.14).');
  await expect(out.locator('.e1-chip')).toHaveCount(0);
});

// ─── Exhibit 2 — encoding, addition, and the tamper proof ────────────────────

test('exhibit 2: the encoding visualizer adds up — noisy = encoded + delta, and the caption bounds it', async ({ page }) => {
  await page.goto('.');
  await page.locator('#e2-encvec').fill('1.5, 2.7, 3.2, 0.8');
  await page.locator('[data-e2-encode]').click();

  const slots = await boxes(page, 0);
  const coeffs = (await boxes(page, 1)).map(Number);
  const noisy = (await boxes(page, 2)).map(Number);
  const delta = (await boxes(page, 3)).map(Number);

  // 4 slots in, 8 coefficients out: the canonical embedding for n = 8.
  expect(slots).toEqual(['s0=1.5', 's1=2.7', 's2=3.2', 's3=0.8']);
  expect(coeffs).toHaveLength(8);
  expect(noisy).toHaveLength(8);
  expect(delta).toHaveLength(8);

  // The three rows are one equation: encrypted = encoded + the RLWE error.
  for (let i = 0; i < 8; i += 1) {
    expect(delta[i], `coefficient ${i}`).toBe(noisy[i]! - coeffs[i]!);
  }
  // "highlighted above" must mark exactly the coefficients that actually moved.
  const changed = delta.filter((d) => d !== 0).length;
  await expect(page.locator('[data-e2-encflow] .cbox.changed')).toHaveCount(changed);
  expect(changed).toBeGreaterThan(0); // there is real noise, not a mock

  // The caption's bound must be the largest error actually shown, and the noise
  // must be tiny next to Δ — which is why decode still recovers the reals.
  const caption = (await page.locator('[data-e2-encflow-caption]').textContent())!;
  const bound = Number(/at most ±(\d+)/.exec(caption)![1]);
  expect(bound).toBe(Math.max(...delta.map(Math.abs)));
  expect(bound).toBeLessThan(DELTA / 100);
  expect(caption).toContain(`Δ=${DELTA}`);

  // The slot values really are spread across every coefficient (that is the
  // embedding's whole point), so the polynomial is not a padded copy of them.
  expect(coeffs.filter((c) => c !== 0).length).toBeGreaterThan(4);
  expect(Math.max(...coeffs.map(Math.abs))).toBeGreaterThan(DELTA);
});

test('exhibit 2: adding ciphertexts adds the slots, and the SIMD lanes match the decryption', async ({ page }) => {
  await page.goto('.');
  const a = [1.5, 2.7, 3.2, 0.8];
  const b = [0.5, 1.3, 2.8, 4.1];
  await page.locator('#vec-a').fill(a.join(', '));
  await page.locator('#vec-b').fill(b.join(', '));
  await page.locator('[data-e2-enc-a]').click();
  await page.locator('[data-e2-enc-b]').click();
  await page.locator('[data-e2-add]').click();
  await page.locator('[data-e2-dec]').click();

  const out = (await page.locator('[data-e2-out]').textContent())!;
  const expected = vec(out, 'Expected');
  const actual = vec(out, 'Actual');
  // "Expected" is the plaintext sum of the two inputs...
  expect(expected).toHaveLength(4);
  expected.forEach((v, i) => expect(v, `slot ${i}`).toBeCloseTo(a[i]! + b[i]!, 6));
  // ...and "Actual" is a real decryption: close, but never exactly equal.
  for (let i = 0; i < 4; i += 1) {
    expect(Math.abs(actual[i]! - expected[i]!), `slot ${i}`).toBeLessThan(0.02);
  }
  expect(actual).not.toEqual(expected);

  // The printed per-slot error must be actual − expected. Both are rounded for
  // display (the vectors to 6dp), so compare within that rounding.
  const errs = /Per-slot error (.+)/.exec(out)![1]!.split(',').map((s) => Number(s.trim()));
  expect(errs).toHaveLength(4);
  for (let i = 0; i < 4; i += 1) {
    expect(Math.abs(errs[i]! - (actual[i]! - expected[i]!)), `slot ${i} error`).toBeLessThan(1e-6);
    expect(errs[i], `slot ${i} error is non-zero`).not.toBe(0);
  }

  // Four SIMD lanes, each showing its own fixed-point arithmetic, and each
  // quoting the same decrypted value the summary printed above.
  const lanes = await page.locator('[data-e2-simd] .simd-lane').allTextContents();
  expect(lanes).toHaveLength(4);
  lanes.forEach((lane, i) => {
    const n = nums(lane);
    const encA = Math.round(a[i]! * DELTA);
    const encB = Math.round(b[i]! * DELTA);
    expect(lane, `lane ${i}`).toContain(`${a[i]} × ${DELTA} = ${encA}`);
    expect(lane, `lane ${i}`).toContain(`${b[i]} × ${DELTA} = ${encB}`);
    expect(lane, `lane ${i}`).toContain(`${encA + encB}/${DELTA} = ${((encA + encB) / DELTA).toFixed(3)}`);
    // Last number on the lane is the decrypted value — the same one above.
    expect(n[n.length - 1], `lane ${i} decrypted`).toBe(Number(actual[i]!.toFixed(4)));
  });
});

test('exhibit 2: nudging one ciphertext coefficient really moves the decrypted slot', async ({ page }) => {
  await page.goto('.');
  await page.locator('[data-e2-enc-a]').click();
  await page.locator('[data-e2-enc-b]').click();
  await page.locator('[data-e2-add]').click();
  await page.locator('[data-e2-dec]').click();
  const actual = vec((await page.locator('[data-e2-out]').textContent())!, 'Actual');

  // Coefficient 0 of the polynomial contributes equally to every slot, so a
  // +2Δ nudge must shift the decoded value by exactly +2.
  await page.locator('#e2-tamper-idx').selectOption('0');
  await page.locator('[data-e2-tamper]').click();
  const tamper = (await page.locator('[data-e2-tamper-out]').textContent())!;
  const [, slotStr, beforeStr, afterStr] =
    /slot (\d) moved from (-?\d+(?:\.\d+)?) to (-?\d+(?:\.\d+)?)/.exec(tamper)!;
  const slot = Number(slotStr);
  const before = Number(beforeStr);
  const after = Number(afterStr);

  expect(tamper).toContain(`Nudged coefficient #0 of c0 by +${2 * DELTA}`);
  // The "before" value is the decryption the panel above already printed — the
  // tamper readout is describing the same ciphertext, not a fresh one.
  expect(before).toBe(Number(actual[slot]!.toFixed(4)));
  expect(after).not.toBe(before);
  expect(Math.abs(after - before - 2)).toBeLessThan(0.02);
  expect(tamper).toContain('the crypto is real');

  // The ciphertext panel now says it is tampered.
  await expect(page.locator('[data-e2-sum]')).toContainText('(tampered)');
});

test('exhibit 2: the two ciphertext views tell the same truth in different clothes', async ({ page }) => {
  await page.goto('.');
  await page.locator('[data-e2-enc-a]').click();
  const pane = page.locator('[data-e2-cta]');

  // Signal view: the ideal encoding, what decryption recovers, and both halves.
  const signal = (await pane.textContent())!;
  const ideal = nums(/signal \(ideal encode\):(.+)/.exec(signal)![1]!);
  const decrypts = nums(/c0 \+ c1·s \(decrypts to\):(.+)/.exec(signal)![1]!);
  const c0 = nums(/c0 \(masked by a·s\):(.+)/.exec(signal)![1]!);
  const c1 = nums(/c1 \(the mask a\):(.+)/.exec(signal)![1]!);
  expect(ideal).toHaveLength(8);
  expect(decrypts).toHaveLength(8);
  expect(c0).toHaveLength(8);
  expect(c1).toHaveLength(8);

  // The page claims c0 + c1·s is "the same signal plus the RLWE error, ±1 at
  // these parameters". Hold it to that.
  for (let i = 0; i < 8; i += 1) {
    expect(Math.abs(decrypts[i]! - ideal[i]!), `coefficient ${i}`).toBeLessThanOrEqual(2);
  }
  // ...and that c0/c1 on their own are spread across the full range (−q/2, q/2],
  // which is the RLWE assumption the exhibit is illustrating. q = 2^50 here.
  const half = 2 ** 49;
  expect(Math.max(...c0.map(Math.abs))).toBeGreaterThan(half / 4);
  expect(Math.max(...c1.map(Math.abs))).toBeGreaterThan(half / 4);
  // The masked halves are nothing like the signal they hide.
  expect(Math.max(...c0.map(Math.abs))).toBeGreaterThan(1000 * Math.max(...ideal.map(Math.abs)));

  // Hex view: the same two polynomials, 8 coefficients each, as stored mod q.
  await page.locator('[data-e2-view="hex"]').click();
  await expect(page.locator('[data-e2-view="hex"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-e2-view="signal"]')).toHaveAttribute('aria-pressed', 'false');
  const hex = (await pane.textContent())!;
  expect(hex).toContain('q=2^50, level=3, scale=1024');
  for (const half of ['c0', 'c1']) {
    const line = new RegExp(`${half}: ([0-9a-f ]+)`).exec(hex)![1]!;
    expect(line.trim().split(/\s+/), half).toHaveLength(8);
  }
  expect(hex).not.toContain('decrypts to');
});

test('exhibit 2: every step refuses to run before its prerequisite', async ({ page }) => {
  await page.goto('.');
  await page.locator('[data-e2-add]').click();
  await expect(page.locator('[data-e2-out]')).toHaveText('Encrypt A and B first.');
  await page.locator('[data-e2-dec]').click();
  await expect(page.locator('[data-e2-out]')).toHaveText('Add ciphertexts first.');
  await page.locator('[data-e2-tamper]').click();
  await expect(page.locator('[data-e2-tamper-out]')).toHaveText('Add both ciphertexts first, then tamper.');
  // Encrypting only A is still not enough to add.
  await page.locator('[data-e2-enc-a]').click();
  await page.locator('[data-e2-add]').click();
  await expect(page.locator('[data-e2-out]')).toHaveText('Encrypt A and B first.');
});

// ─── Exhibit 3 — multiply, relinearize, rescale ──────────────────────────────

test('exhibit 3: the multiply → relinearize → rescale pipeline moves scale, degree and level together', async ({ page }) => {
  await page.goto('.');
  const scale = page.locator('[data-e3-scale]');
  const level = page.locator('[data-e3-level]');
  const budget = page.locator('[data-e3-budget]');
  const status = page.locator('[data-e3-status]');
  const c2 = page.locator('[data-e3-c2]');

  await page.locator('#mul-a').fill('1.5, 2.7');
  await page.locator('#mul-b').fill('2.0, 3.0');
  await page.locator('[data-e3-enc]').click();

  // Fresh ciphertext: top of a 4-modulus chain, scale Δ, 3 multiplies available.
  await expect(scale).toHaveText('2^10 (Δ)');
  await expect(level).toHaveText('3');
  await expect(budget).toHaveText('3 mult');
  await expect(status).toHaveText('Fresh ciphertext');
  const chips = await page.locator('[data-e3-modchain] .mod-chip').evaluateAll((els) =>
    els.map((e) => ({ text: e.textContent!, cls: e.className })),
  );
  expect(chips.map((c) => c.text)).toEqual(['L32^50', 'L22^40', 'L12^30', 'L02^20']);
  expect(chips.filter((c) => c.cls.includes('current')).map((c) => c.text)).toEqual(['L32^50']);
  expect(chips.filter((c) => c.cls.includes('dropped'))).toHaveLength(0);
  await expect(c2).not.toHaveClass(/show/);
  await expect(page.locator('[data-e3-scalefill]')).toHaveAttribute('style', 'width: 50%;');

  // Multiply: scale doubles to Δ² and the degree-2 c2 component appears...
  await page.locator('[data-e3-mul]').click();
  await expect(scale).toHaveText('2^20 (Δ²)');
  await expect(status).toHaveText('Multiplied → Δ², degree 2 (c0,c1,c2)');
  await expect(c2).toHaveClass(/show/);
  await expect(page.locator('[data-e3-scalefill]')).toHaveAttribute('style', 'width: 100%;');
  // ...and relinearization then folds it back to a (c0,c1) pair.
  await expect(status).toHaveText('Relinearized → back to (c0,c1); rescale needed', { timeout: 5000 });
  await expect(c2).not.toHaveClass(/show/);
  await expect(scale).toHaveText('2^20 (Δ²)'); // relinearization does not rescale
  await expect(level).toHaveText('3');

  // Rescale: scale halves back to Δ and exactly one level is consumed.
  await page.locator('[data-e3-rescale]').click();
  await expect(scale).toHaveText('2^10 (Δ)');
  await expect(level).toHaveText('2');
  await expect(budget).toHaveText('2 mult');
  await expect(page.locator('[data-e3-out]')).toContainText('drop modulus L3 from the chain');
  await expect(page.locator('[data-e3-out]')).toContainText('Level 3 → 2');
  const after = await page.locator('[data-e3-modchain] .mod-chip').evaluateAll((els) =>
    els.map((e) => ({ text: e.textContent!, cls: e.className })),
  );
  expect(after.filter((c) => c.cls.includes('current')).map((c) => c.text)).toEqual(['L22^40']);
  expect(after.filter((c) => c.cls.includes('dropped')).map((c) => c.text)).toEqual(['L32^50']);

  // And the decrypted product is the slot-wise product of the inputs.
  await page.locator('[data-e3-dec]').click();
  const out = (await page.locator('[data-e3-out]').textContent())!;
  const got = vec(out, 'Decrypted result ≈');
  const want = vec(out, 'Expected near');
  expect(want).toEqual([3, 8.1]); // 1.5×2.0, 2.7×3.0
  for (let i = 0; i < 2; i += 1) {
    expect(Math.abs(got[i]! - want[i]!), `slot ${i}`).toBeLessThan(0.05);
  }
});

test('exhibit 3: the modulus chain drains one level per rescale, and the steps enforce their order', async ({ page }) => {
  await page.goto('.');
  await page.locator('[data-e3-mul]').click();
  await expect(page.locator('[data-e3-out]')).toHaveText('Encrypt A and B first.');
  await page.locator('[data-e3-rescale]').click();
  await expect(page.locator('[data-e3-out]')).toHaveText('Run multiply first.');
  await page.locator('[data-e3-dec]').click();
  await expect(page.locator('[data-e3-out]')).toHaveText('Run multiply then rescale first.');

  await page.locator('[data-e3-enc]').click();
  await page.locator('[data-e3-mul]').click();
  await expect(page.locator('[data-e3-status]')).toHaveText(
    'Relinearized → back to (c0,c1); rescale needed',
    { timeout: 5000 },
  );
  // Each rescale drops exactly one modulus; the chain has three to give.
  for (const expectedLevel of ['2', '1', '0']) {
    await page.locator('[data-e3-rescale]').click();
    await expect(page.locator('[data-e3-level]')).toHaveText(expectedLevel);
  }
  // A fourth rescale has nothing left to drop and must not go negative.
  await page.locator('[data-e3-rescale]').click();
  await expect(page.locator('[data-e3-level]')).toHaveText('0');
  // The depth budget the modulus chain buys is exactly modChain.length − 1.
  await expect(page.locator('[data-e3-budget]')).toHaveText('exhausted');
  await expect(page.locator('[data-e3-status]')).toHaveText('Modulus exhausted — bootstrap to continue');
  await expect(page.locator('[data-e3-state]')).toHaveClass(/is-exhausted/);
  const chips = await page.locator('[data-e3-modchain] .mod-chip').evaluateAll((els) =>
    els.map((e) => ({ text: e.textContent!, cls: e.className })),
  );
  expect(chips.filter((c) => c.cls.includes('dropped'))).toHaveLength(3);
  expect(chips.filter((c) => c.cls.includes('current')).map((c) => c.text)).toEqual(['L02^20']);
});

// ─── Exhibit 4 — encrypted neural network inference ──────────────────────────

test('exhibit 4: the encrypted forward pass agrees with the plaintext one', async ({ page }) => {
  await page.goto('.');
  const log = page.locator('[data-e4-log]');

  await page.locator('[data-e4-plain]').click();
  const plainText = (await log.textContent())!;
  const plainOut = Number(/output=(-?[\d.]+)/.exec(plainText)![1]);
  const plainCls = Number(/class=(\d)/.exec(plainText)![1]);

  await page.locator('[data-e4-enc]').click();
  // Inputs are locked before anything is computed.
  await expect(page.locator('[data-e4-net] [data-node="in0"]')).toHaveClass(/enc/);
  await expect(log).toContainText('The plaintext values never leave the client');

  await page.locator('[data-e4-run]').click();
  await expect(log).toContainText('every operation below ran on ciphertext');
  // The output stays encrypted until it is explicitly decrypted.
  await expect(page.locator('[data-e4-net] [data-val="out"]')).toHaveText('🔒');

  await page.locator('[data-e4-dec]').click();
  const decText = (await log.textContent())!;
  const dec = Number(/Decrypted output ≈ (-?[\d.]+)/.exec(decText)![1]);
  const ref = Number(/Plaintext reference = (-?[\d.]+)/.exec(decText)![1]);
  const encCls = Number(/Encrypted class=(\d)/.exec(decText)![1]);
  const refCls = Number(/plaintext class=(\d)/.exec(decText)![1]);

  // The whole exhibit's claim: same answer, computed without seeing the input.
  expect(ref).toBe(plainOut);
  expect(refCls).toBe(plainCls);
  expect(encCls).toBe(refCls);
  expect(Math.abs(dec - ref)).toBeLessThan(0.05);
  expect(dec).not.toBe(ref); // approximate, not a plaintext shortcut
  // The class is the page's own threshold rule applied to its own number.
  expect(encCls).toBe(dec > 0.5 ? 1 : 0);
  // The decrypted value is now shown on the output node.
  await expect(page.locator('[data-e4-net] [data-val="out"]')).toHaveText(dec.toFixed(2));
});

test('exhibit 4: the activation gap on the curve matches the activation table', async ({ page }) => {
  await page.goto('.');

  // The table is the exhibit's statement of the polynomial activation: for each
  // sampled x it prints ReLU(x), p(x), and the gap. The gap column must be the
  // difference of the two columns beside it.
  const rows = await page.locator('[data-e4-relu-table] tr').evaluateAll((trs) =>
    trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => Number(td.textContent))),
  );
  expect(rows).toHaveLength(6);
  const table = new Map<number, number>();
  for (const [x, relu, poly, gap] of rows) {
    expect(relu, `ReLU(${x})`).toBe(Math.max(0, x!));
    expect(Math.abs(poly! - relu! - gap!), `gap at ${x}`).toBeLessThan(5e-5);
    table.set(x!, poly!);
  }

  // Recover the quadratic's coefficients from the table itself, then check the
  // gaps the run reports for this input land on the same curve.
  const a0 = table.get(0)!;
  const a1 = (table.get(1)! - table.get(-1)!) / 2;
  const a2 = table.get(1)! - a0 - a1;
  expect(a1).toBeCloseTo(0.5, 4);

  await page.locator('[data-e4-enc]').click();
  await page.locator('[data-e4-run]').click();
  const caption = (await page.locator('[data-e4-relu-caption]').textContent())!;
  const marks = [...caption.matchAll(/h(\d) at x=(-?[\d.]+) \(gap (-?[\d.]+)\)/g)];
  expect(marks).toHaveLength(2); // two hidden neurons
  for (const [, j, xStr, gapStr] of marks) {
    const x = Number(xStr);
    const expectedGap = a0 + a1 * x + a2 * x * x - Math.max(0, x);
    expect(Math.abs(Number(gapStr) - expectedGap), `h${j}`).toBeLessThan(0.005);
  }
  // One marker pair per hidden neuron is drawn on the chart.
  await expect(page.locator('[data-e4-relu-chart] .relu-mark-poly')).toHaveCount(2);
  await expect(page.locator('[data-e4-relu-chart] .relu-mark-relu')).toHaveCount(2);
});

test('exhibit 4: inference refuses to run out of order, and changing an input resets it', async ({ page }) => {
  await page.goto('.');
  const log = page.locator('[data-e4-log]');
  await page.locator('[data-e4-run]').click();
  await expect(log).toHaveText('Encrypt inputs first.');
  await page.locator('[data-e4-dec]').click();
  await expect(log).toHaveText('Run encrypted inference first.');

  await page.locator('[data-e4-enc]').click();
  await page.locator('[data-e4-run]').click();
  await expect(page.locator('[data-e4-net] [data-val="h0"]')).not.toHaveText('');

  // Moving a slider invalidates the displayed state rather than leaving stale
  // values beside a changed input.
  await page.locator('#x1').fill('0.7');
  await expect(page.locator('#x1-val')).toHaveText('0.7');
  await expect(page.locator('[data-e4-net] [data-val="h0"]')).toHaveText('');
  await expect(page.locator('[data-e4-net] .net-node.enc')).toHaveCount(0);
  await expect(page.locator('[data-e4-relu-chart] .relu-mark-poly')).toHaveCount(0);
});

// ─── Exhibit 5 — precision meter and the depth wall ──────────────────────────

test('exhibit 5: the precision meter is computed from the real decrypt error', async ({ page }) => {
  await page.goto('.');
  const log = page.locator('[data-e5-log]');
  const meter = page.locator('[data-e5-meter]');

  const readMeter = async () => ({
    digits: Number(await page.locator('[data-e5-digits]').textContent()),
    rel: (await page.locator('[data-e5-relerr]').textContent())!,
    ops: Number(await page.locator('[data-e5-ops]').textContent()),
    lit: await page.locator('[data-e5-meter] .seg.lit').count(),
    total: await page.locator('[data-e5-meter] .seg').count(),
    health: await meter.getAttribute('data-health'),
  });

  const start = (await log.textContent())!;
  const pi = Number(/Start value \(π\): ([\d.]+)/.exec(start)![1]);
  const back = Number(/After encrypt\/decrypt: ([\d.]+)/.exec(start)![1]);
  expect(pi).toBeCloseTo(Math.PI, 12);
  expect(Math.abs(back - pi)).toBeLessThan(0.01);

  let m = await readMeter();
  // The lit segments ARE the digit count, out of 14 — not a decorative bar.
  expect(m.total).toBe(14);
  expect(m.lit).toBe(m.digits);
  expect(m.ops).toBe(0);
  // The relative error readout is that same decrypt error over the true value.
  expect(m.rel).toBe((Math.abs(back - pi) / Math.abs(pi)).toExponential(1));
  // ...and the digit count is its base-10 magnitude.
  expect(m.digits).toBe(Math.floor(-Math.log10(Math.abs(back - pi) / Math.abs(pi))));
  expect(m.health).toBe(m.digits >= 8 ? 'good' : m.digits >= 4 ? 'warn' : 'bad');

  // Addition is free of depth: the level does not move, and the tracked truth
  // advances by exactly the amount added.
  await page.locator('[data-e5-add]').click();
  const afterAdd = /After add: ([\d.]+) \| true ([\d.]+) .* depth left (\d)/.exec((await log.textContent())!)!;
  expect(Number(afterAdd[2])).toBeCloseTo(pi + 0.125, 10);
  expect(Number(afterAdd[3])).toBe(3);
  expect(Math.abs(Number(afterAdd[1]) - Number(afterAdd[2]))).toBeLessThan(0.02);
  m = await readMeter();
  expect(m.ops).toBe(1);
  expect(m.lit).toBe(m.digits);
});

test('exhibit 5: the depth budget is a wall — the demo refuses rather than printing garbage', async ({ page }) => {
  await page.goto('.');
  const log = page.locator('[data-e5-log]');

  // Three multiply+rescale cycles are exactly what a 4-modulus chain buys.
  for (const depth of ['2', '1', '0']) {
    await page.locator('[data-e5-mul]').click();
    const lines = (await log.textContent())!.trim().split('\n');
    expect(lines[lines.length - 1]).toContain(`depth left ${depth}`);
  }
  const before = (await log.textContent())!;
  expect(await page.locator('[data-e5-ops]').textContent()).toBe('3');

  // The fourth is refused, with the reason — no fake number is printed.
  await page.locator('[data-e5-mul]').click();
  const after = (await log.textContent())!;
  expect(after.startsWith(before)).toBe(true); // nothing rewritten, only appended
  expect(after).toContain('Depth budget exhausted — the ciphertext is at level 0');
  expect(after).toContain('allows 3 multiply+rescale cycles and no more');
  expect(after).toContain('wrap modulo q and decode to garbage');
  expect(after).toContain('This demo stops instead of printing a fake result');
  // No result line was added, and the operation counter did not advance.
  expect((after.match(/After multiply\+rescale/g) ?? []).length).toBe(3);
  expect(await page.locator('[data-e5-ops]').textContent()).toBe('3');

  // Reset restores the full depth budget and clears the log.
  await page.locator('[data-e5-reset]').click();
  const reset = (await log.textContent())!;
  expect(reset).not.toContain('Depth budget exhausted');
  expect(reset).toContain('Start value (π)');
  expect(await page.locator('[data-e5-ops]').textContent()).toBe('0');
  await page.locator('[data-e5-mul]').click();
  expect((await log.textContent())!).toContain('depth left 2');
});

test('exhibit 5: precision really degrades as operations accumulate', async ({ page }) => {
  await page.goto('.');
  const digits = () => page.locator('[data-e5-digits]').textContent().then(Number);
  const startDigits = await digits();

  for (let i = 0; i < 3; i += 1) await page.locator('[data-e5-mul]').click();
  const endDigits = await digits();

  // Every reported line's digit count must match the error it printed beside it.
  const lines = (await page.locator('[data-e5-log]').textContent())!.split('\n');
  let checked = 0;
  for (const line of lines) {
    const m = /: ([\d.]+) \| true ([\d.]+) \| ~(\d+) digits/.exec(line);
    if (!m) continue;
    const rel = Math.abs(Number(m[1]) - Number(m[2])) / Math.abs(Number(m[2]));
    expect(Number(m[3]), line).toBe(Math.max(0, Math.min(14, Math.floor(-Math.log10(rel)))));
    checked += 1;
  }
  expect(checked).toBe(3);
  // Three multiplications cost precision; they never gain it.
  expect(endDigits).toBeLessThanOrEqual(startDigits);
  expect(await page.locator('[data-e5-meter] .seg.lit').count()).toBe(endDigits);
});
