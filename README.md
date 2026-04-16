# crypto-lab-ckks-lab

## 1. What It Is

CKKS Lab demonstrates CKKS (Cheon-Kim-Kim-Song, ASIACRYPT 2017) — the Fully Homomorphic Encryption scheme for approximate arithmetic on real numbers. Unlike BGV/BFV which produce exact integer results, CKKS deliberately introduces small approximation errors to enable efficient floating-point arithmetic on encrypted data. A CKKS ciphertext encodes a vector of real numbers (n/2 slots for polynomial degree n) and supports vectorized addition and multiplication directly on ciphertexts. CKKS is the FHE scheme behind encrypted machine learning inference — the ability to evaluate a neural network on encrypted input without the server ever seeing the plaintext data.

## 2. When to Use It

- ✅ Encrypted neural network inference on private user data
- ✅ Encrypted statistics (mean, variance, dot products) on real-valued data
- ✅ Logistic regression and linear model scoring on encrypted inputs
- ✅ Privacy-preserving genomics (continuous-valued statistical tests)
- ❌ Exact integer arithmetic — use BGV or BFV instead
- ❌ Arbitrary boolean logic — use TFHE instead
- ❌ Applications requiring exact results (financial, cryptographic) — CKKS approximation error will silently produce wrong answers
- ❌ Real-time inference on large models — CKKS is significantly slower than plaintext computation (seconds to minutes for production models)

## 3. Live Demo

Link: https://systemslibrarian.github.io/crypto-lab-ckks-lab/

Six exhibits: what CKKS is and why approximation is the right choice for ML, CKKS encode/encrypt/add with approximation error shown honestly, homomorphic multiplication and rescaling with modulus level tracking, encrypted neural network inference end-to-end (2-layer network on encrypted inputs), precision and error accumulation across multiple operations, and the complete FHE trilogy comparison (TFHE + BGV/BFV + CKKS) with decision tree and library guide.

## 4. How to Run Locally

```bash
git clone https://github.com/systemslibrarian/crypto-lab-ckks-lab
cd crypto-lab-ckks-lab
npm install
npm run dev
```

## 5. Part of the Crypto-Lab Suite

Part of [crypto-lab](https://systemslibrarian.github.io/crypto-lab/) — browser-based cryptography demos spanning 2,500 years of cryptographic history to NIST FIPS 2024 post-quantum standards.

Whether you eat or drink or whatever you do, do it all for the glory of God. — 1 Corinthians 10:31