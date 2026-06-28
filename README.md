# crypto-lab-ckks-lab

## What It Is

CKKS Lab demonstrates CKKS (Cheon-Kim-Kim-Song, ASIACRYPT 2017) — the Fully Homomorphic Encryption scheme for approximate arithmetic on real numbers. Unlike BGV/BFV which produce exact integer results, CKKS deliberately introduces small approximation errors to enable efficient floating-point arithmetic on encrypted data. A CKKS ciphertext encodes a vector of real numbers (n/2 slots for polynomial degree n) and supports vectorized addition and multiplication directly on ciphertexts. CKKS is the FHE scheme behind encrypted machine learning inference — the ability to evaluate a neural network on encrypted input without the server ever seeing the plaintext data.

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

## Live Demo

**[systemslibrarian.github.io/crypto-lab-ckks-lab](https://systemslibrarian.github.io/crypto-lab-ckks-lab/)**

Six exhibits: what CKKS is and why approximation is the right choice for ML, CKKS encode/encrypt/add with approximation error shown honestly, homomorphic multiplication and rescaling with modulus level tracking, encrypted neural network inference end-to-end (2-layer network on encrypted inputs), precision and error accumulation across multiple operations, and the complete FHE trilogy comparison (TFHE + BGV/BFV + CKKS) with decision tree and library guide.

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

*One of 60+ browser demos in the [Crypto Lab](https://crypto-lab.systemslibrarian.dev/) suite.*

*"So whether you eat or drink or whatever you do, do it all for the glory of God." — 1 Corinthians 10:31*
