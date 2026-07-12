export type Theme = 'dark' | 'light'

export type CkksCiphertext = {
  /** RLWE ciphertext polynomials in Z_q[x]/(x^n+1). Decrypts as c0 + c1*s. */
  c0: bigint[]
  c1: bigint[]
  /** Reserved for degree-2 (pre-relinearization) ciphertexts; null once relin'd. */
  c2: bigint[] | null
  /**
   * Ideal (noise-free) slot values. Cache used ONLY to build fresh ciphertexts
   * and for UI comparison — never read as a "decrypted result". Real decryption
   * derives values from (c0, c1, s) in `decryptVector`.
   */
  slots: number[]
  scale: number
  level: number
  encoding: string
  label: string
  noiseBitsLost: number
}

export type CkksParams = {
  n: number
  slotCount: number
  baseScale: number
  modChain: number[]
}
