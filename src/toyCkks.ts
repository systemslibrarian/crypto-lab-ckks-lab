import type { CkksCiphertext, CkksParams } from './types'

/**
 * A REAL (toy-parameter) CKKS engine.
 *
 * This is not a plaintext mock: every displayed result is decrypted from the
 * actual RLWE ciphertext polynomials (c0, c1[, c2]) held in Z_q[x]/(x^n + 1).
 * Decryption computes c0 + c1 * s (mod q) — recovering the encoded plaintext
 * polynomial *plus RLWE noise* — and then runs the CKKS canonical-embedding
 * decoder over that polynomial. The "slots" field is a convenience cache of the
 * IDEAL (noise-free) values used only for building fresh ciphertexts and for
 * comparison in the UI; nothing shown to the user as a "decrypted result" is
 * read from it — see `decryptVector`, which never touches `slots`.
 *
 * Encoding uses the genuine CKKS canonical embedding (the special complex FFT
 * over the primitive 2n-th roots of x^n + 1), so homomorphic multiplication is
 * true slot-wise multiplication, addition is slot-wise addition, and rescaling
 * divides the ciphertext coefficients by Δ and drops a modulus level exactly as
 * in production CKKS. Coefficients are BigInt so the c1*c2 products (which can
 * exceed 2^53) are computed exactly.
 *
 * Toy parameters are deliberately small (n = 8 → 4 slots) so the polynomials
 * are readable. They are NOT secure. Do not use this for anything real.
 */

const TOY_PARAMS: CkksParams = {
  n: 8,
  slotCount: 4,
  baseScale: 2 ** 10,
  // Modulus chain: fresh level uses the largest modulus; each rescale drops to
  // the next (dividing coefficients by Δ = 2^10). Every modulus is > baseScale
  // so a rescale is exact enough for the toy precision we advertise. Enough
  // levels are provided to evaluate a small degree-3 network end-to-end without
  // exhausting the budget mid-circuit.
  //
  // NOTE: these are powers of two, NOT primes. Production CKKS uses a chain of
  // distinct NTT-friendly primes q_i ≡ 1 (mod 2n) so the modulus can be carried
  // in RNS/CRT form; here readability wins, since nothing in this file relies on
  // q being prime (all arithmetic is plain BigInt modular reduction).
  modChain: [2 ** 50, 2 ** 40, 2 ** 30, 2 ** 20]
}

// ─────────────────────────────────────────────────────────────────────────────
// Complex helpers (canonical embedding)
// ─────────────────────────────────────────────────────────────────────────────

type Complex = { re: number; im: number }

const cAdd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im })
const cMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re
})
const cScale = (a: Complex, s: number): Complex => ({ re: a.re * s, im: a.im * s })

/**
 * CKKS canonical embedding for the ring Z[x]/(x^n + 1).
 *
 * The 2n-th roots of unity that are NOT n-th roots are the primitive roots of
 * x^n + 1. We evaluate/interpolate a real polynomial at the n roots
 * ζ^{5^k} (k = 0..n/2-1) and their conjugates. Encoding a length-(n/2) complex
 * vector produces a real coefficient polynomial; decoding evaluates the
 * polynomial at those roots to recover the slots. This is the standard "special
 * FFT" formulation (Cheon et al., 2017) written out directly for clarity.
 */
class CanonicalEmbedding {
  private readonly n: number
  private readonly slots: number
  private readonly roots: Complex[] // ζ^{5^k}, k = 0..slots-1

  constructor(n: number) {
    this.n = n
    this.slots = n / 2
    this.roots = []
    const m = 2 * n
    let exp = 1 // 5^k mod 2n, starting 5^0 = 1
    for (let k = 0; k < this.slots; k += 1) {
      const angle = (2 * Math.PI * exp) / m
      this.roots.push({ re: Math.cos(angle), im: Math.sin(angle) })
      exp = (exp * 5) % m
    }
  }

  /** Encode a real vector (length ≤ slots) into integer coefficients * scale. */
  encode(values: number[], scale: number): bigint[] {
    // Build the full complex slot vector z (length slots).
    const z: Complex[] = Array.from({ length: this.slots }, (_, i) => ({
      re: i < values.length ? values[i] : 0,
      im: 0
    }))

    // Inverse canonical embedding: recover the real polynomial whose evaluation
    // at the roots equals z (and at the conjugate roots equals conj(z)).
    // coeff_j = (1/n) * Σ_slots [ z_k * conj(root_k^j) + conj(z_k) * root_k^j ]
    //         = (2/n) * Σ_slots Re( z_k * conj(root_k^j) )
    const coeffs: bigint[] = new Array(this.n).fill(0n)
    for (let j = 0; j < this.n; j += 1) {
      let acc = 0
      for (let k = 0; k < this.slots; k += 1) {
        const rootPow = this.pow(this.roots[k], j)
        const conj: Complex = { re: rootPow.re, im: -rootPow.im }
        const term = cMul(z[k], conj)
        acc += term.re
      }
      acc = (2 * acc) / this.n
      coeffs[j] = BigInt(Math.round(acc * scale))
    }
    return coeffs
  }

  /** Decode integer coefficients (representing coeff * scale) back to reals. */
  decode(coeffs: number[], scale: number, count: number): number[] {
    const out: number[] = []
    const take = Math.min(this.slots, count)
    for (let k = 0; k < take; k += 1) {
      // Evaluate p(root_k) = Σ_j coeff_j * root_k^j, take real part / scale.
      let acc: Complex = { re: 0, im: 0 }
      for (let j = 0; j < this.n; j += 1) {
        acc = cAdd(acc, cScale(this.pow(this.roots[k], j), coeffs[j]))
      }
      out.push(acc.re / scale)
    }
    return out
  }

  private pow(base: Complex, e: number): Complex {
    let result: Complex = { re: 1, im: 0 }
    for (let i = 0; i < e; i += 1) result = cMul(result, base)
    return result
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exact modular polynomial arithmetic in Z_q[x]/(x^n + 1) with BigInt
// ─────────────────────────────────────────────────────────────────────────────

function bmod(x: bigint, m: bigint): bigint {
  const r = x % m
  return r < 0n ? r + m : r
}

/** Map to the balanced representative in (-q/2, q/2], used for decode & display. */
function centered(x: bigint, q: bigint): bigint {
  const r = bmod(x, q)
  return r > q / 2n ? r - q : r
}

function zeroPoly(n: number): bigint[] {
  return new Array<bigint>(n).fill(0n)
}

function randomBigBelow(q: bigint): bigint {
  // Uniform-ish in [0, q) using crypto randomness where available.
  const bits = q.toString(2).length
  const bytes = Math.ceil(bits / 8)
  const buf = new Uint8Array(bytes)
  const g = (globalThis as { crypto?: Crypto }).crypto
  if (g && typeof g.getRandomValues === 'function') {
    g.getRandomValues(buf)
  } else {
    for (let i = 0; i < bytes; i += 1) buf[i] = Math.floor(Math.random() * 256)
  }
  let v = 0n
  for (const b of buf) v = (v << 8n) | BigInt(b)
  return v % q
}

function randomPoly(n: number, q: bigint): bigint[] {
  return Array.from({ length: n }, () => randomBigBelow(q))
}

/** Ternary secret / small error in {-1, 0, 1}. */
function smallNoisePoly(n: number): bigint[] {
  return Array.from({ length: n }, () => BigInt(Math.floor(Math.random() * 3) - 1))
}

function polyAdd(a: bigint[], b: bigint[], q: bigint): bigint[] {
  return a.map((v, i) => bmod(v + b[i], q))
}

function polySub(a: bigint[], b: bigint[], q: bigint): bigint[] {
  return a.map((v, i) => bmod(v - b[i], q))
}

/** Negacyclic convolution: multiplication modulo (x^n + 1). Exact via BigInt. */
function polyMulNegacyclic(a: bigint[], b: bigint[], n: number, q: bigint): bigint[] {
  const out = zeroPoly(n)
  for (let i = 0; i < n; i += 1) {
    if (a[i] === 0n) continue
    for (let j = 0; j < n; j += 1) {
      const k = i + j
      const prod = a[i] * b[j]
      if (k < n) out[k] = out[k] + prod
      else out[k - n] = out[k - n] - prod
    }
  }
  return out.map((v) => bmod(v, q))
}

function formatPolyHex(poly: bigint[], q: bigint): string {
  const width = q <= 0xffffn ? 4 : q <= 0xffffffffn ? 8 : 12
  return poly.map((v) => bmod(v, q).toString(16).padStart(width, '0')).join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

export class ToyCkksEngine {
  readonly params = TOY_PARAMS
  private readonly secretKey: bigint[]
  private readonly embed: CanonicalEmbedding
  // Relinearization (evaluation) keys via gadget/digit decomposition. For each
  // digit position i we store an RLWE encryption of w^i * s^2 under s, all
  // reduced to the top modulus q0. Relinearization decomposes the degree-2
  // component d2 into base-w digits and recombines through these keys; this is
  // the textbook key-switch that avoids the modulus overflow a single "P*s^2"
  // key would suffer at toy parameters.
  private readonly gadgetBase: bigint
  private readonly gadgetDigits: number
  private readonly relinKeys: { ek0: bigint[]; ek1: bigint[] }[]

  constructor() {
    this.embed = new CanonicalEmbedding(this.params.n)
    this.secretKey = smallNoisePoly(this.params.n)
    // Make sure the secret is not all-zero (would make ciphertexts trivially
    // decodable and break the demo's point); force a non-zero coefficient if so.
    let nonZero = false
    for (const v of this.secretKey) if (v !== 0n) nonZero = true
    if (!nonZero) this.secretKey[0] = 1n

    const q0 = BigInt(this.params.modChain[0])
    // Base-2^10 decomposition: q0 = 2^50 → 6 digits.
    this.gadgetBase = 1n << 10n
    this.gadgetDigits = Math.ceil(Number(q0.toString(2).length) / 10)
    const s2 = polyMulNegacyclic(this.secretKey, this.secretKey, this.params.n, q0)

    this.relinKeys = []
    let wi = 1n
    for (let i = 0; i < this.gadgetDigits; i += 1) {
      const a = randomPoly(this.params.n, q0)
      const e = smallNoisePoly(this.params.n)
      const aTimesS = polyMulNegacyclic(a, this.secretKey, this.params.n, q0)
      // ek0 = -a*s + e + w^i * s^2 ; ek1 = a  =>  ek0 + ek1*s = w^i*s^2 + e
      const wiS2 = s2.map((v) => bmod(v * wi, q0))
      const ek0 = polyAdd(polySub(wiS2, aTimesS, q0), e.map((v) => bmod(v, q0)), q0)
      this.relinKeys.push({ ek0, ek1: a })
      wi *= this.gadgetBase
    }
  }

  /**
   * Modulus for a given level. A fresh ciphertext sits at the top level
   * (modChain.length - 1) with the LARGEST modulus; each rescale drops the
   * level and moves to a smaller modulus. modChain[0] is the largest modulus,
   * so level L maps to modChain[(len-1) - L].
   */
  private q(level: number): bigint {
    const idx = this.params.modChain.length - 1 - level
    return BigInt(this.params.modChain[idx])
  }

  encode(values: number[]): bigint[] {
    return this.embed.encode(values, this.params.baseScale)
  }

  decode(coeffs: bigint[], count: number, scale: number): number[] {
    const centeredCoeffs = coeffs.map((v) => Number(v))
    return this.embed.decode(centeredCoeffs, scale, count)
  }

  /** Symmetric RLWE encryption at the top level. Real: c0 + c1*s = m + e. */
  encryptVector(values: number[], label: string): CkksCiphertext {
    const level = this.params.modChain.length - 1
    const q = this.q(level)
    const encoded = this.encode(values).map((v) => bmod(v, q))
    const a = randomPoly(this.params.n, q)
    const e = smallNoisePoly(this.params.n)
    const aTimesS = polyMulNegacyclic(a, this.secretKey, this.params.n, q)
    // c0 = m - a*s + e ; c1 = a  =>  c0 + c1*s = m + e (mod q)
    const c0 = polyAdd(polySub(encoded, aTimesS, q), e.map((v) => bmod(v, q)), q)

    return {
      c0,
      c1: a,
      c2: null,
      slots: this.idealSlots(values),
      scale: this.params.baseScale,
      level,
      encoding: `Delta=${this.params.baseScale}`,
      label,
      noiseBitsLost: 0
    }
  }

  private idealSlots(values: number[]): number[] {
    return Array.from({ length: this.params.slotCount }, (_, i) => (i < values.length ? values[i] : 0))
  }

  add(a: CkksCiphertext, b: CkksCiphertext, label: string): CkksCiphertext {
    const level = Math.min(a.level, b.level)
    const q = this.q(level)
    return {
      c0: polyAdd(a.c0, b.c0, q),
      c1: polyAdd(a.c1, b.c1, q),
      c2: null,
      slots: a.slots.map((v, i) => v + b.slots[i]),
      scale: a.scale,
      level,
      encoding: `Delta=${a.scale}`,
      label,
      noiseBitsLost: Math.max(a.noiseBitsLost, b.noiseBitsLost)
    }
  }

  /** Base-w digit decomposition of a polynomial (coefficient-wise, non-neg). */
  private decompose(poly: bigint[], q: bigint): bigint[][] {
    const digits: bigint[][] = Array.from({ length: this.gadgetDigits }, () =>
      zeroPoly(this.params.n)
    )
    poly.forEach((coeff, idx) => {
      let v = bmod(coeff, q)
      for (let i = 0; i < this.gadgetDigits; i += 1) {
        digits[i][idx] = v % this.gadgetBase
        v /= this.gadgetBase
      }
    })
    return digits
  }

  /**
   * Homomorphic multiply. The tensor product of two RLWE ciphertexts is a
   * degree-2 ciphertext (d0, d1, d2) that decrypts under (1, s, s^2):
   *   d0 = a0*b0, d1 = a0*b1 + a1*b0, d2 = a1*b1.
   * We then relinearize d2 back down using the evaluation key so the result is
   * again a standard (c0, c1) pair. Scale becomes Δ².
   */
  multiply(a: CkksCiphertext, b: CkksCiphertext, label: string): CkksCiphertext {
    const level = Math.min(a.level, b.level)
    const q = this.q(level)
    const n = this.params.n
    const d0 = polyMulNegacyclic(a.c0, b.c0, n, q)
    const d1 = polyAdd(
      polyMulNegacyclic(a.c0, b.c1, n, q),
      polyMulNegacyclic(a.c1, b.c0, n, q),
      q
    )
    const d2 = polyMulNegacyclic(a.c1, b.c1, n, q)

    // Relinearize by gadget decomposition:
    //   d2 = Σ_i digit_i * w^i,  with 0 ≤ digit_i < w.
    //   Σ_i digit_i * ek_i  ≈  d2 * s^2  (as an RLWE pair under s).
    // Recombining folds the s^2 term of the tensor product back into (c0, c1)
    // without ever exceeding the modulus, because each digit is small.
    const digits = this.decompose(d2, q)
    let rc0 = zeroPoly(n)
    let rc1 = zeroPoly(n)
    for (let i = 0; i < this.gadgetDigits; i += 1) {
      const ek0 = this.relinKeys[i].ek0.map((v) => bmod(v, q))
      const ek1 = this.relinKeys[i].ek1.map((v) => bmod(v, q))
      rc0 = polyAdd(rc0, polyMulNegacyclic(digits[i], ek0, n, q), q)
      rc1 = polyAdd(rc1, polyMulNegacyclic(digits[i], ek1, n, q), q)
    }

    return {
      c0: polyAdd(d0, rc0, q),
      c1: polyAdd(d1, rc1, q),
      c2: null,
      slots: a.slots.map((v, i) => v * b.slots[i]),
      scale: a.scale * b.scale,
      level,
      encoding: `Delta^2=${a.scale * b.scale}`,
      label,
      noiseBitsLost: Math.max(a.noiseBitsLost, b.noiseBitsLost) + 1
    }
  }

  /** Rescale: divide ciphertext by Δ and drop one modulus level. */
  rescale(ct: CkksCiphertext, label: string): CkksCiphertext {
    if (ct.level === 0) {
      return { ...ct, label: `${label} (modulus exhausted)` }
    }
    const nextLevel = ct.level - 1
    const nextQ = this.q(nextLevel)
    const divisor = BigInt(this.params.baseScale)
    const curQ = this.q(ct.level)
    return {
      c0: ct.c0.map((v) => bmod(divRound(centered(v, curQ), divisor), nextQ)),
      c1: ct.c1.map((v) => bmod(divRound(centered(v, curQ), divisor), nextQ)),
      c2: null,
      slots: ct.slots.slice(),
      scale: ct.scale / this.params.baseScale,
      level: nextLevel,
      encoding: `Delta=${ct.scale / this.params.baseScale}`,
      label,
      noiseBitsLost: ct.noiseBitsLost + 1
    }
  }

  /**
   * Multiply a ciphertext by a PLAINTEXT vector (encoded at Δ). No relin needed
   * — a plaintext factor keeps the ciphertext degree at 1. Scale grows to Δ².
   * This is the cheap "plaintext-weight × ciphertext" step used in NN layers.
   */
  multiplyPlain(ct: CkksCiphertext, plainVec: number[], label: string): CkksCiphertext {
    const q = this.q(ct.level)
    const n = this.params.n
    const pt = this.encode(plainVec).map((v) => bmod(v, q))
    return {
      c0: polyMulNegacyclic(ct.c0, pt, n, q),
      c1: polyMulNegacyclic(ct.c1, pt, n, q),
      c2: null,
      slots: ct.slots.map((v, i) => v * (plainVec[i] ?? 0)),
      scale: ct.scale * this.params.baseScale,
      level: ct.level,
      encoding: `Delta^2=${ct.scale * this.params.baseScale}`,
      label,
      noiseBitsLost: ct.noiseBitsLost + 1
    }
  }

  /** Add a PLAINTEXT vector (encoded at the ciphertext's current scale) to c0. */
  addPlain(ct: CkksCiphertext, plainVec: number[], label: string): CkksCiphertext {
    const q = this.q(ct.level)
    const pt = this.embed.encode(plainVec, ct.scale).map((v) => bmod(v, q))
    return {
      ...ct,
      c0: polyAdd(ct.c0, pt, q),
      slots: ct.slots.map((v, i) => v + (plainVec[i] ?? 0)),
      label
    }
  }

  /**
   * REAL decryption. Computes m' = c0 + c1*s (mod q), maps coefficients to the
   * centered range, and decodes via the canonical embedding at the ciphertext's
   * current scale. Nothing here reads `ct.slots`.
   */
  decryptVector(ct: CkksCiphertext, count: number): number[] {
    const q = this.q(ct.level)
    const c1s = polyMulNegacyclic(ct.c1, this.secretKey, this.params.n, q)
    const mNoisy = polyAdd(ct.c0, c1s, q).map((v) => centered(v, q))
    return this.decode(mNoisy, count, ct.scale)
  }

  /** Raw decrypted plaintext polynomial (centered), for inspection/tests. */
  decryptPoly(ct: CkksCiphertext): bigint[] {
    const q = this.q(ct.level)
    const c1s = polyMulNegacyclic(ct.c1, this.secretKey, this.params.n, q)
    return polyAdd(ct.c0, c1s, q).map((v) => centered(v, q))
  }

  formatCiphertext(ct: CkksCiphertext): string {
    const q = this.q(ct.level)
    const c0 = formatPolyHex(ct.c0.slice(0, this.params.n), q)
    const c1 = formatPolyHex(ct.c1.slice(0, this.params.n), q)
    return `label=${ct.label}\nq=2^${Math.round(Math.log2(Number(q)))}, level=${ct.level}, scale=${ct.scale}\nc0: ${c0}\nc1: ${c1}`
  }

  /**
   * Encoding trace for the UI. Returns, for a real input vector:
   *   - slots: the input real values (padded to slotCount)
   *   - coeffs: the encode() output — the integer polynomial coefficients that
   *     the canonical embedding produces (small integers, NOT hex)
   *   - noisy: the SAME polynomial after one real RLWE encryption, i.e. the
   *     centered coefficients of (c0 + c1·s) mod q — signal + RLWE error
   *   - delta: noisy[i] − coeffs[i], the per-coefficient error the encryption added
   * These are the actual numbers flowing through the scheme, so a learner can
   * watch a real value become the polynomial and then pick up noise.
   */
  encodeTrace(values: number[]): {
    slots: number[]
    coeffs: bigint[]
    noisy: bigint[]
    delta: bigint[]
  } {
    const slots = this.idealSlots(values)
    const coeffs = this.encode(values)
    const ct = this.encryptVector(values, 'trace')
    const noisy = this.decryptPoly(ct)
    const delta = noisy.map((v, i) => v - coeffs[i])
    return { slots, coeffs, noisy, delta }
  }

  /**
   * Centered small-integer coefficients of a ciphertext's c0 / c1 polynomials,
   * i.e. the balanced representatives in (−q/2, q/2]. These are what the raw hex
   * dump encodes; showing them centered makes the "signal + tiny noise" reading
   * legible instead of a wall of hex.
   */
  centeredCoeffs(ct: CkksCiphertext): { c0: bigint[]; c1: bigint[] } {
    const q = this.q(ct.level)
    return {
      c0: ct.c0.map((v) => centered(v, q)),
      c1: ct.c1.map((v) => centered(v, q))
    }
  }

  /**
   * Return a copy of the ciphertext with a single coefficient of c0 perturbed by
   * `delta` (a raw ring element). Used by the "tamper" interaction: because
   * decryption is c0 + c1·s, poking one coefficient genuinely shifts the
   * recovered plaintext — proving nothing is read from the ideal slot cache.
   */
  tamperC0(ct: CkksCiphertext, index: number, delta: bigint): CkksCiphertext {
    const q = this.q(ct.level)
    const c0 = ct.c0.slice()
    c0[index] = bmod(c0[index] + delta, q)
    return { ...ct, c0, label: `${ct.label} (tampered)` }
  }

  slotError(expected: number[], actual: number[]): number[] {
    return expected.map((v, i) => actual[i] - v)
  }

  scientific(v: number): string {
    return v.toExponential(3)
  }
}

/** Round-to-nearest integer division for BigInt (handles negatives). */
function divRound(x: bigint, d: bigint): bigint {
  if (d < 0n) return divRound(-x, -d)
  if (x >= 0n) return (x + d / 2n) / d
  return -((-x + d / 2n) / d)
}
