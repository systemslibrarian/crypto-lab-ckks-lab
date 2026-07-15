# crypto-lab-ckks-lab

## What It Is

CKKS Lab demonstrates CKKS (Cheon-Kim-Kim-Song, ASIACRYPT 2017) — the Fully Homomorphic Encryption scheme for approximate arithmetic on real numbers. Unlike BGV/BFV which produce exact integer results, CKKS deliberately introduces small approximation errors to enable efficient floating-point arithmetic on encrypted data. A CKKS ciphertext encodes a vector of real numbers (n/2 slots for polynomial degree n) and supports vectorized addition and multiplication directly on ciphertexts. CKKS is the FHE scheme behind encrypted machine learning inference — the ability to evaluate a neural network on encrypted input without the server ever seeing the plaintext data.

The demo is built for a newcomer to follow start-to-finish: it opens with a one-click "encrypt 3.14, get 3.1401 back" round-trip, then makes the scheme's hardest idea — the canonical embedding — watchable by showing 4 real slot values flow into 8 integer polynomial coefficients and then pick up the tiny RLWE noise term. Ciphertexts render as legible centered "signal + noise" coefficients (with a raw-hex toggle), and you can corrupt a single coefficient and watch a decrypted slot drift, proving the encryption is real by interaction rather than by prose. Advanced material (the FHE decision panel, the RLWE foundation, scheme comparisons) is tucked behind "go deeper" reveals so it never blocks the first hands-on success.

## When to Use It

- ✅ Encrypted neural network inference on private user data
- ✅ Encrypted statistics (mean, variance, dot products) on real-valued data
- ✅ Logistic regression and linear model scoring on encrypted inputs
- ✅ Privacy-preserving genomics (continuous-valued statistical tests)
- ❌ Exact integer arithmetic — use BGV or BFV instead
- ❌ Arbitrary boolean logic — use TFHE instead
- ❌ Applications requiring exact results (financial, cryptographic) — CKKS approximation error will silently produce wrong answers
- ❌ Real-time inference on large models — CKKS is significantly slower than plaintext computation (seconds to minutes for production models)
- Do NOT use this implementation in production — it is a teaching demo built to make the mechanics visible, not a hardened or audited FHE library.

## Is the crypto real?

Yes — this is a genuine (toy-parameter) CKKS engine, not a plaintext mock:

- Ciphertexts are real RLWE polynomial pairs `(c0, c1)` in `Z_q[x]/(x^n + 1)`, held as exact `BigInt` coefficients.
- Encoding/decoding uses the actual CKKS canonical embedding (the special complex FFT over the primitive 2n-th roots of `x^n + 1`), which is a ring homomorphism — so homomorphic multiplication is true slot-wise multiplication.
- `add`, `multiply` (tensor product + gadget-decomposition relinearization) and `rescale` all operate on the ciphertext polynomials.
- **Decryption computes `c0 + c1·s (mod q)` and decodes the recovered polynomial.** No displayed "decrypted result" is ever read from a plaintext cache. Corrupting a ciphertext coefficient changes the decrypted output, and decrypting under the wrong secret key yields garbage — both are pinned by unit tests in `test/toyCkks.test.ts`.
- The encrypted neural-network exhibit runs the entire forward pass (weighted sums, a quadratic polynomial activation whose `x²` term is a real ciphertext multiply, and the output layer) on ciphertexts; only the final result is decrypted, client-side.

The one thing that is deliberately **not** real is security: `n = 8` is far too small to hide anything (128-bit security needs `n ≥ 8192`). Toy timings shown in the UI are illustrative, not measured benchmarks.

## Tests

```bash
npm test        # vitest crypto unit tests (round-trip, add/multiply/rescale, tamper-detection, wrong-key, encrypted NN)
npm run test:a11y   # Playwright + axe WCAG gate (dark + light)
```

## Live Demo

**[systemslibrarian.github.io/crypto-lab-ckks-lab](https://systemslibrarian.github.io/crypto-lab-ckks-lab/)**

Six exhibits:

1. **Encrypt a number, compute on it, get it back** — a one-click encrypt→decrypt round-trip that shows the deliberate approximation gap up front; the "why approximate," FHE-family, and RLWE detail sit in collapsible "go deeper" panels.
2. **Encode, encrypt, add, decrypt** — an encoding visualizer watches 4 real slots become 8 integer polynomial coefficients (the canonical embedding) and then gain the RLWE noise term; ciphertexts show as centered "signal + noise" coefficients (raw-hex toggle available), a click can corrupt a coefficient and drift a decrypted slot, and all four SIMD lanes update together under one "one ciphertext" bracket.
3. **Homomorphic multiplication and rescaling** — a staged multiply → relinearize → rescale pipeline: the scale bar doubles to Δ² then halves back, the `(c0,c1,c2)` degree-2 ciphertext collapses back to `(c0,c1)`, and the modulus chain drops a prime with the current level highlighted (depth-left = level number = multiplications remaining).
4. **Encrypted neural network inference** — a 2-layer network runs end-to-end on encrypted inputs, with the ReLU-vs-polynomial-activation gap plotted as an overlaid curve and each hidden pre-activation marked so the approximation cost is tied to the encrypted-vs-plaintext output difference.
5. **Precision, scale, and error accumulation** — a segmented precision meter whose lit segments are computed from the *actual* decrypt error, degrading live as you add and multiply.
6. **The FHE trilogy** — the full TFHE + BGV/BFV + CKKS comparison with a decision tree and library guide.

## What Can Go Wrong

- CKKS is *approximate*: every ciphertext carries noise, so results are never exact. Using it where an exact answer is required (financial totals, equality checks, cryptographic values) silently yields wrong results.
- Each homomorphic multiplication consumes a level in the modulus chain; running out of levels without bootstrapping corrupts the result, so the multiplicative depth must be planned in advance.
- Scale and rescaling management is error-prone: forgetting to rescale, or combining ciphertexts at mismatched scales, produces meaningless plaintext on decryption.
- Parameter choice (ring degree, modulus chain, scale) sets both the security level and the available compute budget — too small a ring or too large a modulus can break the underlying RLWE security.
- Approximate-decryption leakage (the IND-CPA^D class of attacks): handing raw decrypted CKKS results to an untrusted party can leak information about the secret key unless the decryption output is noise-flooded.

## Real-World Usage

- Privacy-preserving machine-learning inference, where a model runs on encrypted user inputs without the server seeing the plaintext (the canonical CKKS use case).
- Encrypted analytics and statistics on real-valued data (means, variances, dot products) for outsourced or multi-party computation.
- Privacy-preserving genomics and medical computation, where continuous-valued statistical tests run over encrypted records.
- Implemented in major FHE libraries such as Microsoft SEAL, OpenFHE, HEAAN, and Lattigo, which expose CKKS for production research and deployment.

## How to Run Locally

```bash
git clone https://github.com/systemslibrarian/crypto-lab-ckks-lab
cd crypto-lab-ckks-lab
npm install
npm run dev
```

## Related Demos
- [crypto-lab-fhe-arena](https://systemslibrarian.github.io/crypto-lab-fhe-arena/) — BGV/BFV exact-integer FHE, the sibling schemes CKKS is compared against.
- [crypto-lab-blind-oracle](https://systemslibrarian.github.io/crypto-lab-blind-oracle/) — TFHE boolean/programmable-bootstrapping FHE, the third member of the FHE trilogy.
- [crypto-lab-paillier-gate](https://systemslibrarian.github.io/crypto-lab-paillier-gate/) — additively homomorphic encryption, a simpler partial-HE primitive.
- [crypto-lab-elgamal-plain](https://systemslibrarian.github.io/crypto-lab-elgamal-plain/) — multiplicatively homomorphic ElGamal with re-randomization.

---

*"So whether you eat or drink or whatever you do, do it all for the glory of God." — 1 Corinthians 10:31*
