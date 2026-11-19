import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * README claim gate.
 *
 * "What Can Go Wrong" used to end its approximate-decryption bullet with
 * "... unless the decryption output is noise-flooded." That is incomplete in
 * the way that matters: HOW MUCH noise decides whether flooding works.
 *
 * Guo, Nabokov, Suvanto and Johansson, "Key Recovery Attacks on Approximate
 * Homomorphic Encryption with Non-Worst-Case Noise Flooding Countermeasures"
 * (USENIX Security 2024): flooding sized from average-case noise estimates
 * still leaks the key -- they recover it from OpenFHE "using just one shared
 * decryption output" -- and the abstract "emphasizes the necessity of
 * adopting worst-case noise estimation in Approximate Homomorphic Encryption
 * when sharing decryption results".
 */
const read = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const readme = read('../README.md');
const sources = [readme, read('../index.html'), read('../src/main.ts')];

describe('noise flooding is never offered without saying how much', () => {
  it('no file says flooding alone is the remedy', () => {
    for (const text of sources) {
      // The retired sentence, and the general shape: "noise-flooded." as the
      // last word on the subject.
      expect(text).not.toMatch(/unless the decryption output is noise-flooded\./);
      expect(text).not.toMatch(/noise[- ]flooded\.\s*$/m);
    }
  });

  it('the README ties flooding to a worst-case bound and cites the attack on average-case flooding', () => {
    const bullet = readme.split('\n').find((l) => l.includes('IND-CPA^D'));
    expect(bullet).toBeDefined();
    expect(bullet).toMatch(/worst-case bound on the decryption error/);
    expect(bullet).toMatch(/average-case/);
    expect(bullet).toContain('Guo, Nabokov, Suvanto and Johansson');
    expect(bullet).toContain('USENIX Security 2024');
  });
});
