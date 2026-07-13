import { describe, expect, it } from 'vitest'
import { ToyCkksEngine } from '../src/toyCkks'

/**
 * These tests pin the property that the previous version of this demo FAILED:
 * every displayed result must be derived from the actual RLWE ciphertext
 * (c0, c1) via c0 + c1·s, decoded through the canonical embedding — NOT read
 * back from a plaintext `slots` cache. Several tests below deliberately corrupt
 * the ciphertext polynomials and assert the decrypted output changes, which the
 * old `decryptVector` (return slots + noise) could never satisfy.
 */

// Tolerances reflect the deliberately tiny toy scale (Δ = 2^10). Production
// CKKS with Δ = 2^40 would be ~10^-12; here we advertise ~10^-2..10^-3.
const ENC_TOL = 2e-2
const MUL_TOL = 6e-2

function closeTo(actual: number[], expected: number[], tol: number): void {
  expect(actual.length).toBe(expected.length)
  actual.forEach((v, i) => {
    expect(Math.abs(v - expected[i]), `slot ${i}: ${v} vs ${expected[i]}`).toBeLessThan(tol)
  })
}

describe('canonical embedding encode/decode', () => {
  it('decode(encode(x)) ≈ x for a real vector', () => {
    const eng = new ToyCkksEngine()
    const x = [1.5, 2.7, 3.2, 0.8]
    const coeffs = eng.encode(x)
    const back = eng.decode(coeffs, x.length, eng.params.baseScale)
    closeTo(back, x, ENC_TOL)
  })

  it('produces integer (rounded) coefficients — encoding is real, not identity', () => {
    const eng = new ToyCkksEngine()
    const coeffs = eng.encode([0.1, 0.2, 0.3, 0.4])
    // Canonical embedding spreads each slot across ALL coefficients, so a
    // single non-zero slot must still populate more than one coefficient.
    const single = eng.encode([1, 0, 0, 0]).filter((c) => c !== 0n)
    expect(single.length).toBeGreaterThan(1)
    expect(coeffs.every((c) => typeof c === 'bigint')).toBe(true)
  })
})

describe('real RLWE encryption round-trip', () => {
  it('decryptVector recovers the plaintext from (c0, c1, s)', () => {
    const eng = new ToyCkksEngine()
    const x = [0.5, -1.3, 2.8, 4.1]
    const ct = eng.encryptVector(x, 'x')
    closeTo(eng.decryptVector(ct, 4), x, ENC_TOL)
  })

  it('the decrypted result is NOT the ideal slot cache (it carries RLWE noise)', () => {
    const eng = new ToyCkksEngine()
    const x = [1.5, 2.7, 3.2, 0.8]
    const ct = eng.encryptVector(x, 'x')
    const dec = eng.decryptVector(ct, 4)
    // Noise means at least one slot differs from the exact ideal value.
    const anyNoisy = dec.some((v, i) => v !== ct.slots[i])
    expect(anyNoisy).toBe(true)
  })

  it('corrupting c0 changes the decrypted output (proves decrypt uses the ciphertext)', () => {
    const eng = new ToyCkksEngine()
    const ct = eng.encryptVector([1.5, 2.7, 3.2, 0.8], 'x')
    const before = eng.decryptVector(ct, 4)
    const tampered = { ...ct, c0: ct.c0.map((v, i) => (i === 0 ? v + 500000n : v)) }
    const after = eng.decryptVector(tampered, 4)
    // If decrypt read `slots`, this would be unchanged. It must change.
    expect(after).not.toEqual(before)
  })

  it('decrypting with a different secret key yields garbage', () => {
    const a = new ToyCkksEngine()
    const b = new ToyCkksEngine() // independent random secret key
    const ct = a.encryptVector([1.5, 2.7, 3.2, 0.8], 'x')
    const wrong = b.decryptVector(ct, 4)
    // Under the wrong key the recovered values are far from the plaintext.
    const maxErr = Math.max(...wrong.map((v, i) => Math.abs(v - [1.5, 2.7, 3.2, 0.8][i])))
    expect(maxErr).toBeGreaterThan(0.5)
  })
})

describe('encoding trace and coefficient views (Exhibit 2 visualizers)', () => {
  it('encodeTrace exposes real slots, integer coeffs, and a small noise delta', () => {
    const eng = new ToyCkksEngine()
    const t = eng.encodeTrace([1.5, 2.7, 3.2, 0.8])
    expect(t.slots).toEqual([1.5, 2.7, 3.2, 0.8])
    expect(t.coeffs.length).toBe(eng.params.n)
    expect(t.noisy.length).toBe(eng.params.n)
    // Every coeff is an integer BigInt (encoding is real, not identity).
    expect(t.coeffs.every((c) => typeof c === 'bigint')).toBe(true)
    // The noise the encryption added is small relative to the scale (Δ=1024),
    // and at least one coefficient actually moved (encryption is not a no-op).
    const moved = t.delta.some((d) => d !== 0n)
    expect(moved).toBe(true)
    const maxDelta = t.delta.reduce((m, d) => (d > m ? d : -d > m ? -d : m), 0n)
    expect(Number(maxDelta)).toBeLessThan(eng.params.baseScale)
  })

  it('centeredCoeffs returns balanced small integers, not raw [0,q) values', () => {
    const eng = new ToyCkksEngine()
    const ct = eng.encryptVector([1.5, 2.7, 3.2, 0.8], 'x')
    const { c0 } = eng.centeredCoeffs(ct)
    const q = eng.params.modChain[0]
    // Balanced representatives live in (−q/2, q/2].
    expect(c0.every((v) => Number(v) > -q / 2 && Number(v) <= q / 2)).toBe(true)
  })

  it('tamperC0 shifts the decrypted slot (decrypt truly uses the ciphertext)', () => {
    const eng = new ToyCkksEngine()
    const ct = eng.encryptVector([1.5, 2.7, 3.2, 0.8], 'x')
    const before = eng.decryptVector(ct, 4)
    const tampered = eng.tamperC0(ct, 0, BigInt(eng.params.baseScale) * 3n)
    const after = eng.decryptVector(tampered, 4)
    expect(after).not.toEqual(before)
    // A shift on coefficient 0 alone must visibly move the recovered values.
    const maxDrift = Math.max(...after.map((v, i) => Math.abs(v - before[i])))
    expect(maxDrift).toBeGreaterThan(0.1)
  })
})

describe('homomorphic addition', () => {
  it('Decrypt(Enc(a) + Enc(b)) ≈ a + b, decrypted from the summed ciphertext', () => {
    const eng = new ToyCkksEngine()
    const a = [1.5, 2.7, 3.2, 0.8]
    const b = [0.5, 1.3, 2.8, 4.1]
    const sum = eng.add(eng.encryptVector(a, 'a'), eng.encryptVector(b, 'b'), 'a+b')
    const expected = a.map((v, i) => v + b[i])
    closeTo(eng.decryptVector(sum, 4), expected, ENC_TOL)
  })
})

describe('homomorphic multiplication + rescale', () => {
  it('Decrypt(Enc(a) * Enc(b)) ≈ a * b slot-wise (canonical embedding is a ring hom)', () => {
    const eng = new ToyCkksEngine()
    const a = [1.5, 2.7]
    const b = [2.0, 3.0]
    const prod = eng.multiply(eng.encryptVector(a, 'a'), eng.encryptVector(b, 'b'), 'a*b')
    const expected = a.map((v, i) => v * b[i])
    closeTo(eng.decryptVector(prod, 2), expected, MUL_TOL)
  })

  it('scale grows to Δ² after multiply, returns to Δ and drops a level after rescale', () => {
    const eng = new ToyCkksEngine()
    const a = eng.encryptVector([1.5, 2.7], 'a')
    const b = eng.encryptVector([2.0, 3.0], 'b')
    const prod = eng.multiply(a, b, 'a*b')
    expect(prod.scale).toBe(eng.params.baseScale ** 2)
    const rs = eng.rescale(prod, 'r')
    expect(rs.scale).toBe(eng.params.baseScale)
    expect(rs.level).toBe(prod.level - 1)
    // Value still correct after rescale.
    closeTo(eng.decryptVector(rs, 2), [3.0, 8.1], MUL_TOL)
  })

  it('relinearization keeps the ciphertext at degree 1 (a valid (c0,c1) pair)', () => {
    const eng = new ToyCkksEngine()
    const prod = eng.multiply(
      eng.encryptVector([1.1, 2.2], 'a'),
      eng.encryptVector([3.3, 0.5], 'b'),
      'p'
    )
    expect(prod.c2).toBeNull()
    // A relinearized degree-1 ciphertext must still decrypt with just (1, s).
    closeTo(eng.decryptVector(prod, 2), [1.1 * 3.3, 2.2 * 0.5], MUL_TOL)
  })

  it('chained multiply+rescale tracks the true product (Exhibit 5 path)', () => {
    const eng = new ToyCkksEngine()
    let ct = eng.encryptVector([3.14159265358979], 'pi')
    let truth = 3.14159265358979
    for (let i = 0; i < 2; i += 1) {
      const m = eng.encryptVector([1.1], `m${i}`)
      ct = eng.rescale(eng.multiply(ct, m, `mul${i}`), `rs${i}`)
      truth *= 1.1
    }
    expect(Math.abs(eng.decryptVector(ct, 1)[0] - truth)).toBeLessThan(0.1)
  })
})

describe('plaintext-ciphertext operations (NN building blocks)', () => {
  it('multiplyPlain scales each slot by a plaintext weight', () => {
    const eng = new ToyCkksEngine()
    const ct = eng.encryptVector([1.0, 2.0], 'x')
    const scaled = eng.rescale(eng.multiplyPlain(ct, [0.5, -0.3], 'w'), 'r')
    closeTo(eng.decryptVector(scaled, 2), [0.5, -0.6], MUL_TOL)
  })

  it('addPlain adds a plaintext bias', () => {
    const eng = new ToyCkksEngine()
    const ct = eng.encryptVector([0.7, -0.2], 'x')
    const biased = eng.addPlain(ct, [0.1, 0.5], 'b')
    closeTo(eng.decryptVector(biased, 2), [0.8, 0.3], ENC_TOL)
  })
})

describe('encrypted NN inference runs on ciphertext (Exhibit 4 honesty)', () => {
  // Mirrors the exact homomorphic forward pass used in the UI: each input
  // encrypted separately, weighted sums built via multiplyPlain + add, a
  // quadratic activation whose x² term is a real ciphertext multiply, output
  // layer, and a single final decrypt. The plaintext reference is only for
  // comparison; the encrypted path never decrypts an input.
  const W1 = [
    [0.5, -0.3, 0.7, 0.2],
    [-0.4, 0.8, 0.1, -0.2]
  ]
  const b1 = [0.1, -0.05]
  const W2 = [0.6, -0.7]
  const b2 = 0.2
  const ACT = { a0: 0.0946, a1: 0.5, a2: 0.4642 }
  const actPoly = (x: number) => ACT.a0 + ACT.a1 * x + ACT.a2 * x * x

  function plaintextForward(x: number[]): number {
    const h = W1.map((row) => row.reduce((acc, w, i) => acc + w * x[i], 0))
      .map((s, j) => actPoly(s + b1[j]))
    return W2.reduce((acc, w, i) => acc + w * h[i], b2)
  }

  it('encrypted forward pass matches the plaintext reference within tolerance', () => {
    const eng = new ToyCkksEngine()
    const x = [0.3, -0.1, 0.6, 0.2]
    const cx = x.map((v, i) => eng.encryptVector([v], `x${i}`))

    const linComb = (w: number[], bias: number, tag: string) => {
      let acc = eng.multiplyPlain(cx[0], [w[0]], `${tag}0`)
      for (let i = 1; i < w.length; i += 1) acc = eng.add(acc, eng.multiplyPlain(cx[i], [w[i]], `${tag}${i}`), tag)
      return eng.addPlain(eng.rescale(acc, `${tag}r`), [bias], `${tag}b`)
    }
    const activation = (h: typeof cx[number], tag: string) => {
      const h2 = eng.rescale(eng.multiply(h, h, `${tag}h2`), `${tag}h2r`)
      const lin = eng.rescale(eng.multiplyPlain(h, [ACT.a1], `${tag}l`), `${tag}lr`)
      const quad = eng.rescale(eng.multiplyPlain(h2, [ACT.a2], `${tag}q`), `${tag}qr`)
      const linLow = eng.rescale(eng.multiplyPlain(lin, [1], `${tag}id`), `${tag}idr`)
      return eng.addPlain(eng.add(linLow, quad, `${tag}s`), [ACT.a0], `${tag}a0`)
    }

    const h0 = activation(linComb(W1[0], b1[0], 'h0'), 'a0')
    const h1 = activation(linComb(W1[1], b1[1], 'h1'), 'a1')
    let out = eng.multiplyPlain(h0, [W2[0]], 'o0')
    out = eng.add(out, eng.multiplyPlain(h1, [W2[1]], 'o1'), 'o')
    out = eng.addPlain(out, [b2], 'ob')

    const yEnc = eng.decryptVector(out, 1)[0]
    const yRef = plaintextForward(x)
    expect(Math.abs(yEnc - yRef)).toBeLessThan(0.05)
  })
})
