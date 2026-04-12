import type { CkksCiphertext, CkksParams } from './types'

const TOY_PARAMS: CkksParams = {
  n: 8,
  slotCount: 4,
  baseScale: 2 ** 10,
  modChain: [2 ** 30, 2 ** 20]
}

function mod(x: number, m: number): number {
  const r = x % m
  return r < 0 ? r + m : r
}

function zeroPoly(n: number): number[] {
  return Array.from({ length: n }, () => 0)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPoly(n: number, q: number): number[] {
  return Array.from({ length: n }, () => randomInt(0, q - 1))
}

function smallNoisePoly(n: number): number[] {
  return Array.from({ length: n }, () => randomInt(-1, 1))
}

function polyAdd(a: number[], b: number[], q: number): number[] {
  return a.map((v, i) => mod(v + b[i], q))
}

function polySub(a: number[], b: number[], q: number): number[] {
  return a.map((v, i) => mod(v - b[i], q))
}

function polyMulNegacyclic(a: number[], b: number[], n: number, q: number): number[] {
  const out = zeroPoly(n)
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const k = i + j
      if (k < n) {
        out[k] = mod(out[k] + a[i] * b[j], q)
      } else {
        out[k - n] = mod(out[k - n] - a[i] * b[j], q)
      }
    }
  }
  return out
}

function formatPolyHex(poly: number[], q: number): string {
  const width = q <= 0xffff ? 4 : 8
  return poly.map((v) => mod(v, q).toString(16).padStart(width, '0')).join(' ')
}

function quantizeToScale(value: number, scale: number): number {
  return Math.round(value * scale) / scale
}

function stochasticError(scale: number, multiplier = 0.55): number {
  return (Math.random() - 0.5) * multiplier / Math.max(1, scale)
}

export class ToyCkksEngine {
  readonly params = TOY_PARAMS
  private readonly secretKey: number[]

  constructor() {
    this.secretKey = smallNoisePoly(this.params.n)
  }

  encode(values: number[]): number[] {
    const out = zeroPoly(this.params.n)
    const slots = Math.min(this.params.slotCount, values.length)
    for (let i = 0; i < slots; i += 1) {
      out[i] = Math.round(values[i] * this.params.baseScale)
    }
    return out
  }

  decode(poly: number[], count: number, scale: number): number[] {
    const out: number[] = []
    const slots = Math.min(this.params.slotCount, count)
    for (let i = 0; i < slots; i += 1) {
      out.push(poly[i] / scale)
    }
    return out
  }

  encryptVector(values: number[], label: string): CkksCiphertext {
    const q = this.params.modChain[0]
    const encoded = this.encode(values)
    const a = randomPoly(this.params.n, q)
    const e = smallNoisePoly(this.params.n)
    const aTimesS = polyMulNegacyclic(a, this.secretKey.map((v) => mod(v, q)), this.params.n, q)
    const c0 = polyAdd(polySub(encoded.map((v) => mod(v, q)), aTimesS, q), e.map((v) => mod(v, q)), q)

    const slots = Array.from({ length: this.params.slotCount }, (_, i) => {
      const v = i < values.length ? values[i] : 0
      return quantizeToScale(v, this.params.baseScale) + stochasticError(this.params.baseScale)
    })

    return {
      c0,
      c1: a,
      slots,
      scale: this.params.baseScale,
      level: this.params.modChain.length - 1,
      encoding: `Delta=${this.params.baseScale}`,
      label,
      noiseBitsLost: 0
    }
  }

  add(a: CkksCiphertext, b: CkksCiphertext, label: string): CkksCiphertext {
    const q = this.params.modChain[Math.min(a.level, b.level)]
    return {
      c0: polyAdd(a.c0, b.c0, q),
      c1: polyAdd(a.c1, b.c1, q),
      slots: a.slots.map((v, i) => quantizeToScale(v + b.slots[i], this.params.baseScale) + stochasticError(a.scale, 0.25)),
      scale: a.scale,
      level: Math.min(a.level, b.level),
      encoding: `Delta=${a.scale}`,
      label,
      noiseBitsLost: Math.max(a.noiseBitsLost, b.noiseBitsLost)
    }
  }

  multiply(a: CkksCiphertext, b: CkksCiphertext, label: string): CkksCiphertext {
    const q = this.params.modChain[Math.min(a.level, b.level)]
    const slotScale = a.scale * b.scale
    return {
      c0: polyMulNegacyclic(a.c0, b.c0, this.params.n, q),
      c1: polyMulNegacyclic(a.c1, b.c1, this.params.n, q),
      slots: a.slots.map((v, i) => quantizeToScale(v * b.slots[i], slotScale) + stochasticError(slotScale, 0.9)),
      scale: slotScale,
      level: Math.min(a.level, b.level),
      encoding: `Delta^2=${slotScale}`,
      label,
      noiseBitsLost: Math.max(a.noiseBitsLost, b.noiseBitsLost) + 1
    }
  }

  rescale(ct: CkksCiphertext, label: string): CkksCiphertext {
    if (ct.level === 0) {
      return {
        ...ct,
        label: `${label} (modulus exhausted)`
      }
    }

    const nextLevel = ct.level - 1
    const q = this.params.modChain[nextLevel]
    const divisor = this.params.baseScale

    return {
      c0: ct.c0.map((v) => mod(Math.round(v / divisor), q)),
      c1: ct.c1.map((v) => mod(Math.round(v / divisor), q)),
      slots: ct.slots.map((v) => quantizeToScale(v, this.params.baseScale) + stochasticError(this.params.baseScale, 0.7)),
      scale: this.params.baseScale,
      level: nextLevel,
      encoding: `Delta=${this.params.baseScale}`,
      label,
      noiseBitsLost: ct.noiseBitsLost + 1
    }
  }

  decryptVector(ct: CkksCiphertext, count: number): number[] {
    const slots = Math.min(this.params.slotCount, count)
    const precisionPenalty = ct.noiseBitsLost / 1024
    return ct.slots.slice(0, slots).map((v) => v + stochasticError(ct.scale, 0.35) + precisionPenalty * stochasticError(1, 0.6))
  }

  encryptFromPlainSlots(values: number[], level: number, noiseBitsLost: number, label: string): CkksCiphertext {
    const q = this.params.modChain[level]
    return {
      c0: randomPoly(this.params.n, q),
      c1: randomPoly(this.params.n, q),
      slots: values.map((v) => quantizeToScale(v, this.params.baseScale) + stochasticError(this.params.baseScale, 0.6)),
      scale: this.params.baseScale,
      level,
      encoding: `Delta=${this.params.baseScale}`,
      label,
      noiseBitsLost
    }
  }

  formatCiphertext(ct: CkksCiphertext): string {
    const q = this.params.modChain[ct.level]
    const c0 = formatPolyHex(ct.c0.slice(0, this.params.n), q)
    const c1 = formatPolyHex(ct.c1.slice(0, this.params.n), q)
    return `label=${ct.label}\nq=2^${Math.round(Math.log2(q))}, level=${ct.level}, scale=${ct.scale}\nc0: ${c0}\nc1: ${c1}`
  }

  slotError(expected: number[], actual: number[]): number[] {
    return expected.map((v, i) => actual[i] - v)
  }

  scientific(v: number): string {
    return v.toExponential(3)
  }

  preciseDigitsApprox(ct: CkksCiphertext): number {
    const bits = Math.max(2, 10 - ct.noiseBitsLost)
    return Math.max(1, Math.floor(bits * Math.LOG10E * Math.log(2)))
  }
}
