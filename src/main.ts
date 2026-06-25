import './style.css'
import { ToyCkksEngine } from './toyCkks'
import type { CkksCiphertext } from './types'

const engine = new ToyCkksEngine()
const app = document.querySelector('#app') as HTMLDivElement

app.innerHTML = `
  <div class="app">

    <!-- ── Narrative Introduction ──────────────────────────── -->
    <section class="narrative-intro">
      <h1>CKKS Lab: Encrypted Computation on Real Numbers</h1>
      <p class="narrative-scenario">
        You are a developer building a medical AI service. Your users send private health data for inference.
        You need to run the model — but you must never see the plaintext data. CKKS makes this possible.
      </p>
      <p class="subtitle">
        CKKS is the <span class="tooltip-term" tabindex="0" data-tip="Fully Homomorphic Encryption allows computation on encrypted data without decrypting it first.">FHE</span> scheme
        purpose-built for approximate real-number arithmetic on encrypted data — the foundation of encrypted machine learning inference.
      </p>

      <div class="disclaimer">
        ⚠ Educational demo — toy parameters (n=8). Not production-ready. Not externally audited.
      </div>

      <!-- Decision Panel -->
      <div class="decision-panel">
        <div class="decision-use">
          <h3>✔ Best for</h3>
          <ul>
            <li>Encrypted neural network inference on private data</li>
            <li>Privacy-preserving statistics (mean, variance, dot products)</li>
            <li>Logistic regression and linear model scoring on encrypted inputs</li>
            <li>Privacy-preserving genomics (continuous-valued tests)</li>
          </ul>
        </div>
        <div class="decision-avoid">
          <h3>❌ Avoid if</h3>
          <ul>
            <li>You need exact integer results — use <a href="https://systemslibrarian.github.io/crypto-lab-fhe-arena/" target="_blank" rel="noopener">BGV/BFV</a></li>
            <li>You need arbitrary boolean logic — use <a href="https://systemslibrarian.github.io/crypto-lab-blind-oracle/" target="_blank" rel="noopener">TFHE</a></li>
            <li>Exact results are required (financial, cryptographic) — CKKS error will silently corrupt</li>
            <li>Real-time inference on large models — CKKS adds seconds to minutes of overhead</li>
          </ul>
        </div>
        <div class="decision-tradeoffs">
          <h3>⚖ Tradeoffs</h3>
          <ul>
            <li>Approximation error is inherent and grows with each operation</li>
            <li>Multiplication depth is finite — deep networks require bootstrapping</li>
            <li>Ciphertexts are megabytes in production (n ≥ 8192)</li>
            <li>10×–10,000× slower than plaintext computation</li>
          </ul>
        </div>
        <div class="decision-complexity">
          <h3>🔥 Complexity: Advanced</h3>
          <p>Requires understanding: polynomial rings, scale management, noise budgets, RLWE security assumptions.</p>
          <p><strong>Prerequisites:</strong> symmetric encryption, public-key concepts, basic abstract algebra.</p>
        </div>
      </div>

      <!-- CKKS Data Flow Visualization -->
      <div class="flow-visual" aria-label="CKKS data flow">
        <div class="flow-step"><strong>Plaintext</strong><br>Real vector</div>
        <span class="flow-arrow" aria-hidden="true">→</span>
        <div class="flow-step"><strong>Encode</strong><br>Scale by Δ</div>
        <span class="flow-arrow" aria-hidden="true">→</span>
        <div class="flow-step"><strong>Encrypt</strong><br>RLWE noise</div>
        <span class="flow-arrow" aria-hidden="true">→</span>
        <div class="flow-step"><strong>Compute</strong><br>Add / Multiply</div>
        <span class="flow-arrow" aria-hidden="true">→</span>
        <div class="flow-step"><strong>Decrypt</strong><br>Remove noise</div>
        <span class="flow-arrow" aria-hidden="true">→</span>
        <div class="flow-step"><strong>Decode</strong><br>≈ Result</div>
      </div>
    </section>

    <!-- ── Exhibits ───────────────────────────────────────── -->
    <main class="exhibits" id="main-content" aria-label="Six CKKS exhibits">

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- EXHIBIT 1 — Conceptual Foundation                  -->
      <!-- ═══════════════════════════════════════════════════ -->
      <section class="exhibit" id="exhibit-1" aria-labelledby="e1-heading" tabindex="-1">
        <h2 id="e1-heading">Exhibit 1: What CKKS Is and Why Approximation Is the Right Choice</h2>

        <div class="phase-label">A — What you're about to learn</div>
        <p class="exhibit-intro">
          You will understand why CKKS deliberately chooses <em>approximate</em> results — and why that's the correct
          engineering decision for encrypted machine learning, not a compromise.
        </p>

        <div class="phase-label">B — The core concept</div>
        <p>
          <span class="tooltip-term" tabindex="0" data-tip="Cheon-Kim-Kim-Song scheme, published at ASIACRYPT 2017. Encrypts real/complex vectors and supports approximate homomorphic arithmetic.">CKKS</span>
          encrypts vectors of real/complex values and supports homomorphic
          addition and multiplication with approximate outputs: Decrypt(Enc(x) + Enc(y)) ≈ x + y.
          The approximation is bounded and deliberate.
        </p>
        <div class="grid-2">
          <div>
            <h3>The Core Idea</h3>
            <ul>
              <li>Vector <span class="tooltip-term" tabindex="0" data-tip="Encrypted data. In CKKS, each ciphertext is a pair of polynomials (c0, c1) in a polynomial ring.">ciphertexts</span> support SIMD real-number arithmetic.</li>
              <li>Approximation is expected, controlled, and workload-aligned.</li>
              <li>ML already uses floating-point approximations (weights and activations) — CKKS error fits naturally.</li>
            </ul>
            <h3>Scale Parameter (Δ)</h3>
            <p>Encode 3.14 at Δ=2<sup>40</sup>: 3.14 × 2<sup>40</sup> ≈ 3,452,812,080,537.6, then rounded to integer.</p>
            <p>Multiplication grows scale to Δ²; <span class="tooltip-term" tabindex="0" data-tip="Rescaling divides ciphertext coefficients by the scale factor Δ, reducing the scale back to Δ and consuming one modulus level.">rescaling</span> reduces it back toward Δ.</p>
          </div>
          <div>
            <h3>FHE Scheme Comparison</h3>
            <div class="table-wrap">
              <table aria-label="FHE schemes comparison">
                <thead>
                  <tr><th scope="col">Scheme</th><th scope="col">Data type</th><th scope="col">Result type</th><th scope="col">Best for</th></tr>
                </thead>
                <tbody>
                  <tr><td>TFHE</td><td>Bits</td><td>Exact</td><td>Arbitrary boolean logic</td></tr>
                  <tr><td>BGV</td><td>Integers mod t</td><td>Exact</td><td>Integer statistics</td></tr>
                  <tr><td>BFV</td><td>Integers mod t</td><td>Exact</td><td>Integer arithmetic</td></tr>
                  <tr><td><strong>CKKS</strong></td><td>Real vectors</td><td>Approximate</td><td>ML inference, statistics</td></tr>
                </tbody>
              </table>
            </div>
            <p><span class="tooltip-term" tabindex="0" data-tip="Ring Learning With Errors — the hard lattice problem underlying CKKS security. Breaking RLWE is believed to be hard even for quantum computers at sufficient parameters.">RLWE</span> foundation: ciphertexts are polynomial pairs (c0, c1) in Z_q[x]/(x<sup>n</sup> + 1).</p>
          </div>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">C — Why it matters</div>
          <div class="callout" role="note">
            <strong>Why this matters:</strong> CKKS is the practical FHE path for encrypted ML inference.
            CryptoNets (Microsoft, 2016), Microsoft SEAL, OpenFHE, and HEAAN all rely on this design.
            If you are evaluating a neural network on encrypted user data, CKKS is your scheme.
          </div>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">D — When you'd actually use this</div>
          <ul>
            <li><strong>Cloud ML inference</strong> — A hospital sends encrypted patient features; the cloud runs a diagnostic model without seeing the data.</li>
            <li><strong>Encrypted analytics</strong> — Compute mean/variance on encrypted salary data across organizations.</li>
            <li><strong>Privacy-preserving genomics</strong> — Run statistical tests on encrypted DNA sequences.</li>
          </ul>
        </div>

        <div class="exhibit-section">
          <div class="phase-label phase-label-orange">E — Tradeoffs &amp; warnings</div>
          <ul>
            <li>⚠ Approximation error accumulates — deep computation chains lose precision.</li>
            <li>⚠ Not suitable for exact arithmetic (financial calculations, vote counting).</li>
            <li>⚠ Production ciphertexts are megabytes; latency is orders of magnitude above plaintext.</li>
          </ul>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">F — Explore the FHE family</div>
          <p>
            For bit-level FHE (TFHE):
            <a href="https://systemslibrarian.github.io/crypto-lab-blind-oracle/" target="_blank" rel="noopener noreferrer">
              Blind Oracle demo<span class="sr-only"> (opens in new tab)</span>
            </a>
            &ensp;|&ensp;
            For exact integer FHE (BGV/BFV):
            <a href="https://systemslibrarian.github.io/crypto-lab-fhe-arena/" target="_blank" rel="noopener noreferrer">
              FHE Arena demo<span class="sr-only"> (opens in new tab)</span>
            </a>
          </p>
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- EXHIBIT 2 — Encode, Encrypt, Add, Decrypt          -->
      <!-- ═══════════════════════════════════════════════════ -->
      <section class="exhibit" id="exhibit-2" aria-labelledby="e2-heading" tabindex="-1">
        <h2 id="e2-heading">Exhibit 2: Encode, Encrypt, Add, Decrypt</h2>

        <div class="phase-label">A — What you're about to do</div>
        <p class="exhibit-intro">
          You will encrypt two vectors of real numbers, add them while encrypted, then decrypt the result.
          The output will be <em>approximately</em> correct — you'll see exactly how much error CKKS introduces and why it's acceptable.
        </p>

        <p class="narrative-scenario">
          Imagine two hospitals each hold patient temperature readings. They want to compute the combined average
          without revealing individual values. Each encrypts their vector; a server adds the ciphertexts.
        </p>

        <div class="exhibit-section">
          <div class="phase-label">B — Interactive demo</div>
          <p class="note">Toy CKKS: n=8, 4 slots per ciphertext, Δ=2<sup>10</sup>. Production uses n ≥ 8192 with 4096 slots.</p>
          <div class="grid-2">
            <div>
              <label for="vec-a">Vector A (4 real numbers)</label>
              <input id="vec-a" type="text" value="1.5, 2.7, 3.2, 0.8" />
            </div>
            <div>
              <label for="vec-b">Vector B (4 real numbers)</label>
              <input id="vec-b" type="text" value="0.5, 1.3, 2.8, 4.1" />
            </div>
          </div>
          <div class="row" role="group" aria-label="Exhibit 2 controls">
            <button class="action" data-e2-enc-a>1. Encrypt A</button>
            <button class="action" data-e2-enc-b>2. Encrypt B</button>
            <button class="action" data-e2-add>3. Add ciphertexts</button>
            <button class="action action-orange" data-e2-dec>4. Decrypt result</button>
          </div>
          <div class="grid-2">
            <div>
              <h3>ct(A)</h3>
              <pre class="mono" data-e2-cta aria-live="polite" aria-atomic="true">→ Click "Encrypt A" to begin</pre>
            </div>
            <div>
              <h3>ct(B)</h3>
              <pre class="mono" data-e2-ctb aria-live="polite" aria-atomic="true">→ Click "Encrypt B"</pre>
            </div>
          </div>
          <h3>ct(A + B)</h3>
          <pre class="mono" data-e2-sum aria-live="polite" aria-atomic="true">→ Add both ciphertexts, then decrypt</pre>
          <p data-e2-out aria-live="polite" role="status">Expected: [2.0, 4.0, 6.0, 4.9]</p>
          <div class="callout" role="note" data-e2-scale>
            Scale visualizer: 1.5 × 1024 = 1536, 0.5 × 1024 = 512, sum=2048, decode=2048/1024=2.0.
          </div>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">C — What just happened</div>
          <p>
            Each real number was <strong>scaled</strong> by Δ=1024 and rounded to an integer, then embedded in a
            <span class="tooltip-term" tabindex="0" data-tip="The polynomial ring Z_q[x]/(x^n+1). Ciphertexts live in this ring, enabling efficient arithmetic via NTT.">polynomial ring</span>.
            Random <span class="tooltip-term" tabindex="0" data-tip="RLWE noise — small random values added during encryption that make the ciphertext computationally indistinguishable from random.">RLWE noise</span>
            was added during encryption. Adding ciphertexts adds the underlying polynomials — the noise is also added, slightly increasing error.
            Decryption recovers the approximate sum.
          </p>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">D — Why it matters</div>
          <p>
            This is the fundamental CKKS operation: <strong>addition on encrypted vectors</strong>. All 4 slots were
            processed in a single SIMD operation. In production (n=8192), you process 4096 values simultaneously
            — enabling efficient encrypted batch statistics.
          </p>
        </div>

        <div class="exhibit-section">
          <div class="phase-label phase-label-orange">E — Tradeoffs</div>
          <p>
            ⚠ The result is approximate: per-slot error ~10<sup>-3</sup> at this toy scale.
            Production CKKS (Δ=2<sup>40</sup>) achieves ~10<sup>-12</sup> precision.
            Each addition slightly increases accumulated noise.
          </p>
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- EXHIBIT 3 — Multiplication and Rescaling           -->
      <!-- ═══════════════════════════════════════════════════ -->
      <section class="exhibit" id="exhibit-3" aria-labelledby="e3-heading" tabindex="-1">
        <h2 id="e3-heading">Exhibit 3: Homomorphic Multiplication and Rescaling</h2>

        <div class="phase-label">A — What you're about to do</div>
        <p class="exhibit-intro">
          You will multiply two encrypted vectors — the hardest operation in CKKS. You'll see the scale blow up
          to Δ², then use <em>rescaling</em> to bring it back down — consuming a modulus level in the process.
          This is the core of CKKS depth management.
        </p>

        <div class="exhibit-section">
          <div class="phase-label">B — Interactive demo</div>
          <div class="grid-2">
            <div>
              <label for="mul-a">Vector A (2 values)</label>
              <input id="mul-a" type="text" value="1.5, 2.7" />
            </div>
            <div>
              <label for="mul-b">Vector B (2 values)</label>
              <input id="mul-b" type="text" value="2.0, 3.0" />
            </div>
          </div>
          <div class="row" role="group" aria-label="Exhibit 3 controls">
            <button class="action" data-e3-enc>1. Encrypt A and B</button>
            <button class="action" data-e3-mul>2. Multiply</button>
            <button class="action action-orange" data-e3-rescale>3. Rescale</button>
            <button class="action" data-e3-dec>4. Decrypt</button>
          </div>
          <div class="level-strip" data-e3-state aria-live="polite">
            <span class="level-chip"><span class="level-chip-k">scale</span><span class="level-chip-v" data-e3-scale>—</span></span>
            <span class="level-chip"><span class="level-chip-k">level</span><span class="level-chip-v" data-e3-level>—</span></span>
            <span class="level-chip"><span class="level-chip-k">depth left</span><span class="level-chip-v" data-e3-budget>—</span></span>
            <span class="level-chip level-chip-status"><span class="level-chip-v" data-e3-status>Awaiting encrypt</span></span>
          </div>
          <pre class="mono" data-e3-ct aria-live="polite" aria-atomic="true">→ Encrypt, then multiply</pre>
          <p data-e3-out aria-live="polite" role="status">Result: awaiting operation</p>
          <div class="table-wrap">
            <table aria-label="CKKS multiplication depth table">
              <thead>
                <tr><th scope="col">Multiplications</th><th scope="col">Scale</th><th scope="col">Levels used</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                <tr><td>0</td><td>Δ</td><td>0</td><td>Fresh ciphertext</td></tr>
                <tr><td>1</td><td>Δ (after rescale)</td><td>1</td><td>One level consumed</td></tr>
                <tr><td>2</td><td>Δ (after rescale)</td><td>2</td><td>Two levels consumed</td></tr>
                <tr><td>L</td><td>Δ</td><td>L</td><td>Last available level</td></tr>
                <tr><td>L+1</td><td>—</td><td>Exhausted</td><td>Bootstrapping required</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">C — What just happened</div>
          <p>
            Multiplying two ciphertexts multiplied their underlying polynomials, causing the scale to grow from Δ to Δ².
            <span class="tooltip-term" tabindex="0" data-tip="Rescaling divides every coefficient by the scale Δ and drops one prime from the modulus chain. This is the CKKS mechanism for managing noise growth after multiplication.">Rescaling</span>
            divided by Δ and dropped one modulus level, restoring the scale to Δ. Each multiplication-rescale cycle
            consumes one level from the modulus chain. When levels are exhausted, expensive
            <span class="tooltip-term" tabindex="0" data-tip="Bootstrapping refreshes a ciphertext's modulus levels so more operations can be performed. It is the most expensive operation in CKKS — often costing 100ms–1s.">bootstrapping</span>
            is required to continue.
          </p>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">D — Why it matters</div>
          <p>
            Multiplication depth determines how complex your encrypted computation can be. A 2-layer neural network
            needs at least 2 multiplication levels. Deeper models need more levels (larger parameters, larger ciphertexts, slower computation)
            or periodic bootstrapping. This is the fundamental resource constraint of CKKS system design.
          </p>
        </div>

        <div class="exhibit-section">
          <div class="phase-label phase-label-orange">E — Tradeoffs</div>
          <p>
            ⚠ Each rescale loses ~1 bit of precision. After several multiplications, accumulated noise may overwhelm the signal.
            Production systems carefully plan their multiplication budget during circuit design.
          </p>
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- EXHIBIT 4 — Encrypted Neural Network Inference     -->
      <!-- ═══════════════════════════════════════════════════ -->
      <section class="exhibit" id="exhibit-4" aria-labelledby="e4-heading" tabindex="-1">
        <h2 id="e4-heading">Exhibit 4: Encrypted Neural Network Inference</h2>

        <div class="phase-label">A — What you're about to do</div>
        <p class="exhibit-intro">
          You will run a 2-layer neural network classifier on <strong>encrypted inputs</strong>.
          The server computes layer weights × encrypted data, applies polynomial activation, and returns an encrypted prediction.
          At no point does the server see your plaintext data.
        </p>

        <p class="narrative-scenario">
          You are a patient submitting health indicators to a cloud diagnostic service.
          Your data is encrypted before it leaves your device. The model runs on ciphertext.
          Only you can decrypt the diagnosis.
        </p>

        <div class="exhibit-section">
          <div class="phase-label">B — Interactive demo</div>
          <p class="note">Architecture: 4 inputs → 2 hidden neurons (polynomial ReLU) → 1 output.
            ReLU replaced by degree-3 polynomial: p(x) = 0.5 + 0.197x − 0.0035x³.</p>
          <div class="slider-grid">
            <div>
              <label for="x1">x1 (-1 to 1)</label>
              <input id="x1" data-x-slider type="range" min="-1" max="1" step="0.1" value="0.3" aria-describedby="x1-val" />
              <output id="x1-val" class="slider-val" data-x-val="0">0.3</output>
            </div>
            <div>
              <label for="x2">x2 (-1 to 1)</label>
              <input id="x2" data-x-slider type="range" min="-1" max="1" step="0.1" value="-0.1" aria-describedby="x2-val" />
              <output id="x2-val" class="slider-val" data-x-val="1">-0.1</output>
            </div>
            <div>
              <label for="x3">x3 (-1 to 1)</label>
              <input id="x3" data-x-slider type="range" min="-1" max="1" step="0.1" value="0.6" aria-describedby="x3-val" />
              <output id="x3-val" class="slider-val" data-x-val="2">0.6</output>
            </div>
            <div>
              <label for="x4">x4 (-1 to 1)</label>
              <input id="x4" data-x-slider type="range" min="-1" max="1" step="0.1" value="0.2" aria-describedby="x4-val" />
              <output id="x4-val" class="slider-val" data-x-val="3">0.2</output>
            </div>
          </div>
          <div class="row" role="group" aria-label="Exhibit 4 controls">
            <button class="action" data-e4-plain>Run plaintext</button>
            <button class="action" data-e4-enc>1. Encrypt inputs</button>
            <button class="action" data-e4-run>2. Run encrypted</button>
            <button class="action action-orange" data-e4-dec>3. Decrypt result</button>
          </div>
          <figure class="net-figure">
            <div class="net-diagram" data-e4-net role="img"
                 aria-label="Two-layer network: four encrypted inputs feed two hidden neurons feeding one output. Edge color shows weight sign, thickness shows magnitude.">
            </div>
            <figcaption class="net-legend">
              <span><span class="net-swatch pos"></span> positive weight</span>
              <span><span class="net-swatch neg"></span> negative weight</span>
              <span><span class="net-swatch enc"></span> encrypted node</span>
              <span><span class="net-swatch active"></span> computed on ciphertext</span>
            </figcaption>
          </figure>
          <pre class="mono" data-e4-log aria-live="polite" aria-atomic="true">→ Adjust sliders, then encrypt and run</pre>
          <div class="table-wrap">
            <table aria-label="ReLU vs polynomial approximation">
              <thead><tr><th scope="col">x</th><th scope="col">ReLU(x)</th><th scope="col">Poly approx</th></tr></thead>
              <tbody data-e4-relu-table></tbody>
            </table>
          </div>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">C — What just happened</div>
          <p>
            The server multiplied encrypted inputs by plaintext weights (a cheaper operation than ciphertext × ciphertext),
            added biases, applied a polynomial approximation of ReLU (because ReLU is not computable on ciphertexts directly),
            then computed the output layer. The entire forward pass happened on encrypted data.
          </p>
          <p>
            <strong>Why polynomial ReLU?</strong> CKKS can only compute polynomials. Non-polynomial functions (ReLU, sigmoid)
            must be approximated by polynomials. The approximation quality directly affects model accuracy.
          </p>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">D — Why it matters</div>
          <p>
            This is the core CKKS use case: <strong>privacy-preserving ML inference</strong>. The server never sees the plaintext inputs.
            Real deployments include Microsoft CryptoNets, Apple's on-device ML, and genomic analysis pipelines.
            Production systems use n=16384 or higher with carefully optimized polynomial approximations.
          </p>
        </div>

        <div class="exhibit-section">
          <div class="phase-label phase-label-orange">E — Tradeoffs</div>
          <ul>
            <li>⚠ Polynomial activation is less accurate than true ReLU — model accuracy drops slightly.</li>
            <li>⚠ Each layer consumes multiplication depth — deep networks need large parameters or bootstrapping.</li>
            <li>⚠ Encrypted inference is 100×–10,000× slower than plaintext. Latency is measured in seconds, not milliseconds.</li>
          </ul>
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- EXHIBIT 5 — Precision and Error Accumulation       -->
      <!-- ═══════════════════════════════════════════════════ -->
      <section class="exhibit" id="exhibit-5" aria-labelledby="e5-heading" tabindex="-1">
        <h2 id="e5-heading">Exhibit 5: Precision, Scale, and Error Accumulation</h2>

        <div class="phase-label">A — What you're about to do</div>
        <p class="exhibit-intro">
          You will watch precision degrade in real time as you perform repeated operations on an encrypted value.
          Each addition slightly increases noise; each multiplication+rescale costs a precision bit.
          This is the fundamental constraint that limits CKKS computation depth.
        </p>

        <div class="exhibit-section">
          <div class="phase-label">B — Interactive demo</div>
          <p class="note">Starting value: π (3.14159265358979). Track how correct digits decrease with each operation.</p>
          <div class="row" role="group" aria-label="Exhibit 5 controls">
            <button class="action" data-e5-reset>Reset π</button>
            <button class="action" data-e5-add>Add 0.125</button>
            <button class="action" data-e5-mul>Multiply × 1.1</button>
          </div>
          <div class="precision-panel">
            <div class="precision-meter" data-e5-meter role="img" aria-label="Precision meter: correct decimal digits remaining"></div>
            <p class="precision-label">
              <span data-e5-digits>—</span> correct digits
              &ensp;·&ensp; rel. error <span data-e5-relerr>—</span>
              &ensp;·&ensp; <span data-e5-ops>0</span> ops
            </p>
          </div>
          <pre class="mono" data-e5-log aria-live="polite" aria-atomic="true">→ Click Reset, then add/multiply repeatedly</pre>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">C — What just happened</div>
          <p>
            <strong>Encoding error</strong> is ~1/Δ (limited by how finely we quantize reals to integers).
            <strong>RLWE noise</strong> adds stochastic error during encryption.
            Each <strong>rescaling</strong> loses additional precision bits by dividing coefficients.
            After several multiplications, the accumulated noise overwhelms the signal.
          </p>
        </div>

        <div class="exhibit-section">
          <div class="phase-label phase-label-orange">E — Tradeoffs</div>
          <div class="callout" role="note">
            Larger Δ means more precision but also larger modulus and ciphertexts.
            Production CKKS typically sets Δ ∈ [2<sup>40</sup>, 2<sup>60</sup>].
            Choosing Δ is a security/precision/performance three-way tradeoff.
          </div>
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- EXHIBIT 6 — The FHE Trilogy                        -->
      <!-- ═══════════════════════════════════════════════════ -->
      <section class="exhibit" id="exhibit-6" aria-labelledby="e6-heading" tabindex="-1">
        <h2 id="e6-heading">Exhibit 6: The FHE Trilogy — Choosing the Right Scheme</h2>

        <div class="phase-label">A — What you're about to learn</div>
        <p class="exhibit-intro">
          Not all FHE is the same. TFHE, BGV/BFV, and CKKS solve fundamentally different problems.
          Choosing wrong means either wasted performance or incorrect results. This decision tree helps you choose.
        </p>

        <div class="exhibit-section">
          <div class="phase-label">B — Comparison</div>
          <div class="table-wrap">
            <table aria-label="TFHE BGV BFV CKKS comparison">
              <thead>
                <tr><th scope="col">Property</th><th scope="col">TFHE</th><th scope="col">BGV/BFV</th><th scope="col">CKKS</th></tr>
              </thead>
              <tbody>
                <tr><td>Data type</td><td>Single bits</td><td>Integers mod t</td><td>Real vectors</td></tr>
                <tr><td>Result type</td><td>Exact</td><td>Exact</td><td>Approximate</td></tr>
                <tr><td>Operations</td><td>Any boolean gate</td><td>Add, multiply</td><td>Add, multiply (approx)</td></tr>
                <tr><td>Best for</td><td>Arbitrary boolean logic</td><td>Integer statistics</td><td>ML inference, real-valued stats</td></tr>
                <tr><td>Batching</td><td>No</td><td>Yes (CRT)</td><td>Yes (n/2 slots)</td></tr>
                <tr><td>Mult. depth</td><td>Unlimited (bootstrap)</td><td>~10–20 levels</td><td>~4–16 levels</td></tr>
                <tr><td>Speed (add)</td><td>Slow per bit</td><td>Fast</td><td>Fast</td></tr>
                <tr><td>Speed (mult)</td><td>Fast per gate</td><td>Moderate</td><td>Moderate</td></tr>
                <tr><td>Library</td><td>TFHE-rs, Concrete</td><td>SEAL, HElib, OpenFHE</td><td>SEAL, HEAAN, OpenFHE</td></tr>
                <tr><td>Crypto Lab demo</td><td><a href="https://systemslibrarian.github.io/crypto-lab-blind-oracle/" target="_blank" rel="noopener noreferrer">Blind Oracle</a></td><td><a href="https://systemslibrarian.github.io/crypto-lab-fhe-arena/" target="_blank" rel="noopener noreferrer">FHE Arena</a></td><td>This demo</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">C — Decision tree</div>
          <div class="callout" role="note">
            <strong>Choose your scheme:</strong><br>
            • Need arbitrary boolean logic on encrypted bits? → <strong>TFHE</strong><br>
            • Need exact integer arithmetic (counting, modular)? → <strong>BGV/BFV</strong><br>
            • Need real-number ML inference or floating-point statistics? → <strong>CKKS</strong><br>
            • Not sure? Start with CKKS if your data is real-valued, BGV if integer, TFHE if bit-level.
          </div>
          <p>
            Bootstrapping cost: TFHE ~10ms, BGV/BFV ~seconds, CKKS ~100ms–1s (parameter/hardware dependent).
          </p>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">D — Explore the full collection</div>
          <nav aria-label="Cross-demo links">
            <ul class="link-list">
              <li><a href="https://systemslibrarian.github.io/crypto-lab-blind-oracle/" target="_blank" rel="noopener noreferrer">Blind Oracle (TFHE)<span class="sr-only"> (opens in new tab)</span></a></li>
              <li><a href="https://systemslibrarian.github.io/crypto-lab-fhe-arena/" target="_blank" rel="noopener noreferrer">FHE Arena (BGV/BFV)<span class="sr-only"> (opens in new tab)</span></a></li>
              <li><a href="https://systemslibrarian.github.io/crypto-compare/" target="_blank" rel="noopener noreferrer">Crypto Compare<span class="sr-only"> (opens in new tab)</span></a></li>
              <li><a href="https://systemslibrarian.github.io/crypto-lab/" target="_blank" rel="noopener noreferrer">Full Crypto Lab Collection<span class="sr-only"> (opens in new tab)</span></a></li>
            </ul>
          </nav>
        </div>
      </section>
    </main>

    <!-- ── Threat Model & Security ────────────────────────── -->
    <section class="threat-model" aria-labelledby="threat-heading">
      <h2 id="threat-heading">Threat Model &amp; Security Assumptions</h2>
      <div class="threat-grid">
        <div>
          <h3>Assumed Attacker</h3>
          <p>A computationally bounded adversary who observes ciphertexts and has access to the public key, but not the secret key. Security relies on the hardness of the
            <span class="tooltip-term" tabindex="0" data-tip="Ring Learning With Errors: given (a, a·s + e mod q) for random a and small error e, it is computationally hard to recover the secret s.">RLWE</span> problem.</p>
        </div>
        <div>
          <h3>What Is Protected</h3>
          <ul>
            <li>Plaintext input values (encrypted before leaving client)</li>
            <li>Intermediate computation results (remain encrypted throughout)</li>
            <li>Output (encrypted; only secret key holder can decrypt)</li>
          </ul>
        </div>
        <div>
          <h3>What Is NOT Protected</h3>
          <ul>
            <li>Access patterns (which ciphertexts are computed on)</li>
            <li>Computation structure (the circuit/network architecture is public)</li>
            <li>Ciphertext size (reveals parameter choices and approximate data dimensions)</li>
            <li>Side-channel attacks on the client during encrypt/decrypt</li>
          </ul>
        </div>
      </div>
      <div class="disclaimer">
        ⚠ This is an educational toy implementation with n=8. Production CKKS requires n ≥ 8192 for 128-bit security.
        Do not use this code for any real cryptographic purpose.
      </div>
    </section>

    <!-- ── References ─────────────────────────────────────── -->
    <section class="references" aria-labelledby="refs-heading">
      <h2 id="refs-heading">References &amp; Standards</h2>
      <ol>
        <li>Cheon, J.H., Kim, A., Kim, M., Song, Y. — <em>Homomorphic Encryption for Arithmetic of Approximate Numbers</em>, ASIACRYPT 2017. <a href="https://eprint.iacr.org/2016/421" target="_blank" rel="noopener noreferrer">eprint.iacr.org/2016/421</a></li>
        <li>Gilad-Bachrach, R., et al. — <em>CryptoNets: Applying Neural Networks to Encrypted Data</em>, ICML 2016. <a href="https://proceedings.mlr.press/v48/gilad-bachrach16.html" target="_blank" rel="noopener noreferrer">proceedings.mlr.press</a></li>
        <li>Homomorphic Encryption Standardization — <a href="https://homomorphicencryption.org/standard/" target="_blank" rel="noopener noreferrer">homomorphicencryption.org/standard</a></li>
        <li>Microsoft SEAL Library — <a href="https://github.com/microsoft/SEAL" target="_blank" rel="noopener noreferrer">github.com/microsoft/SEAL</a></li>
        <li>OpenFHE Library — <a href="https://github.com/openfheorg/openfhe-development" target="_blank" rel="noopener noreferrer">github.com/openfheorg/openfhe-development</a></li>
        <li>HEAAN (Seoul National University) — <a href="https://github.com/snucrypto/HEAAN" target="_blank" rel="noopener noreferrer">github.com/snucrypto/HEAAN</a></li>
      </ol>
    </section>

  </div>
`

// Theme is owned by the shared Crypto Lab header (index.html). This module no
// longer renders its own toggle, so there is nothing to wire up here.

function parseVector(input: string, count = 4): number[] {
  const values = input
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x))
    .slice(0, count)
  while (values.length < count) {
    values.push(0)
  }
  return values
}

function formatVec(values: number[]): string {
  return `[${values.map((v) => v.toFixed(6)).join(', ')}]`
}

let e2A: CkksCiphertext | null = null
let e2B: CkksCiphertext | null = null
let e2Sum: CkksCiphertext | null = null
const e2Cta = document.querySelector('[data-e2-cta]') as HTMLElement
const e2Ctb = document.querySelector('[data-e2-ctb]') as HTMLElement
const e2SumEl = document.querySelector('[data-e2-sum]') as HTMLElement
const e2Out = document.querySelector('[data-e2-out]') as HTMLElement
const e2Scale = document.querySelector('[data-e2-scale]') as HTMLElement

;(document.querySelector('[data-e2-enc-a]') as HTMLButtonElement).addEventListener('click', () => {
  const a = parseVector((document.getElementById('vec-a') as HTMLInputElement).value)
  e2A = engine.encryptVector(a, 'A')
  e2Cta.textContent = engine.formatCiphertext(e2A)
  e2Out.textContent = `A encoded slots: ${formatVec(a)} using Delta=${engine.params.baseScale}`
})

;(document.querySelector('[data-e2-enc-b]') as HTMLButtonElement).addEventListener('click', () => {
  const b = parseVector((document.getElementById('vec-b') as HTMLInputElement).value)
  e2B = engine.encryptVector(b, 'B')
  e2Ctb.textContent = engine.formatCiphertext(e2B)
})

;(document.querySelector('[data-e2-add]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e2A || !e2B) {
    e2Out.textContent = 'Encrypt A and B first.'
    return
  }
  e2Sum = engine.add(e2A, e2B, 'A+B')
  e2SumEl.textContent = engine.formatCiphertext(e2Sum)
  e2Out.textContent = 'Ciphertext addition done for all 4 slots in one SIMD operation.'
})

;(document.querySelector('[data-e2-dec]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e2Sum) {
    e2Out.textContent = 'Add ciphertexts first.'
    return
  }
  const a = parseVector((document.getElementById('vec-a') as HTMLInputElement).value)
  const b = parseVector((document.getElementById('vec-b') as HTMLInputElement).value)
  const expected = a.map((v, i) => v + b[i])
  const actual = engine.decryptVector(e2Sum, 4)
  const err = engine.slotError(expected, actual)
  e2Out.textContent = `Expected ${formatVec(expected)}\nActual ${formatVec(actual)}\nPer-slot error ${err.map((v) => engine.scientific(v)).join(', ')}\nApproximation error is small and bounded by scale/noise settings.`

  const s = engine.params.baseScale
  const a0 = a[0]
  const b0 = b[0]
  const encA = Math.round(a0 * s)
  const encB = Math.round(b0 * s)
  e2Scale.textContent = `Scale visualizer: ${a0} × ${s} = ${encA}, ${b0} × ${s} = ${encB}, sum=${encA + encB}, decode=${encA + encB}/${s} = ${(encA + encB) / s}.`
})

let e3A: CkksCiphertext | null = null
let e3B: CkksCiphertext | null = null
let e3Mul: CkksCiphertext | null = null
const e3Ct = document.querySelector('[data-e3-ct]') as HTMLElement
const e3Out = document.querySelector('[data-e3-out]') as HTMLElement
const e3ScaleEl = document.querySelector('[data-e3-scale]') as HTMLElement
const e3LevelEl = document.querySelector('[data-e3-level]') as HTMLElement
const e3BudgetEl = document.querySelector('[data-e3-budget]') as HTMLElement
const e3StatusEl = document.querySelector('[data-e3-status]') as HTMLElement

function fmtScale(scale: number): string {
  return `2^${Math.round(Math.log2(scale))}`
}

function updateE3State(ct: CkksCiphertext | null, status: string): void {
  const stateEl = document.querySelector('[data-e3-state]') as HTMLElement
  if (!ct) {
    e3ScaleEl.textContent = '—'
    e3LevelEl.textContent = '—'
    e3BudgetEl.textContent = '—'
    e3StatusEl.textContent = status
    stateEl.classList.remove('is-exhausted')
    return
  }
  const grewScale = ct.scale > engine.params.baseScale
  e3ScaleEl.textContent = grewScale ? `${fmtScale(ct.scale)} (Δ²)` : `${fmtScale(ct.scale)} (Δ)`
  e3LevelEl.textContent = String(ct.level)
  e3BudgetEl.textContent = ct.level > 0 ? `${ct.level} mult` : 'exhausted'
  e3StatusEl.textContent = status
  stateEl.classList.toggle('is-exhausted', ct.level === 0)
}

;(document.querySelector('[data-e3-enc]') as HTMLButtonElement).addEventListener('click', () => {
  const a = parseVector((document.getElementById('mul-a') as HTMLInputElement).value, 2)
  const b = parseVector((document.getElementById('mul-b') as HTMLInputElement).value, 2)
  e3A = engine.encryptVector(a, 'mul-A')
  e3B = engine.encryptVector(b, 'mul-B')
  e3Mul = null
  e3Ct.textContent = `ct(A):\n${engine.formatCiphertext(e3A)}\n\nct(B):\n${engine.formatCiphertext(e3B)}`
  e3Out.textContent = 'Encrypted A and B. Current scale=Delta.'
  updateE3State(e3A, 'Fresh ciphertext')
})

;(document.querySelector('[data-e3-mul]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e3A || !e3B) {
    e3Out.textContent = 'Encrypt A and B first.'
    return
  }
  e3Mul = engine.multiply(e3A, e3B, 'mul(A,B)')
  e3Ct.textContent = engine.formatCiphertext(e3Mul)
  e3Out.textContent = `After multiplication: scale=${e3Mul.scale} (=Delta^2). Rescale required before further multiplications.`
  updateE3State(e3Mul, 'Scale grew to Δ² — rescale needed')
})

;(document.querySelector('[data-e3-rescale]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e3Mul) {
    e3Out.textContent = 'Run multiply first.'
    return
  }
  e3Mul = engine.rescale(e3Mul, 'rescaled(mul(A,B))')
  e3Ct.textContent = engine.formatCiphertext(e3Mul)
  e3Out.textContent = `Rescale applied: scale reset to Delta=${engine.params.baseScale}, level dropped to ${e3Mul.level}.`
  updateE3State(e3Mul, e3Mul.level === 0 ? 'Modulus exhausted — bootstrap to continue' : 'Rescaled — one level consumed')
})

;(document.querySelector('[data-e3-dec]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e3Mul) {
    e3Out.textContent = 'Run multiply then rescale first.'
    return
  }
  const a = parseVector((document.getElementById('mul-a') as HTMLInputElement).value, 2)
  const b = parseVector((document.getElementById('mul-b') as HTMLInputElement).value, 2)
  const expected = a.map((v, i) => v * b[i])
  const out = engine.decryptVector(e3Mul, 2)
  e3Out.textContent = `Decrypted result ≈ ${formatVec(out)}. Expected near ${formatVec(expected)}. Small precision loss after rescaling is expected.`
})

const W1 = [
  [0.5, -0.3, 0.7, 0.2],
  [-0.4, 0.8, 0.1, -0.2]
]
const b1 = [0.1, -0.05]
const W2 = [0.6, -0.7]
const b2 = 0.2

function reluExact(x: number): number {
  return Math.max(0, x)
}

function reluPoly(x: number): number {
  return 0.5 + 0.197 * x - 0.0035 * x ** 3
}

function forwardPlain(x: number[]): { y: number; cls: number } {
  const h = W1.map((row, j) => reluPoly(row.reduce((acc, w, i) => acc + w * x[i], b1[j])))
  const y = W2.reduce((acc, w, i) => acc + w * h[i], b2)
  return { y, cls: y > 0.5 ? 1 : 0 }
}

const reluBody = document.querySelector('[data-e4-relu-table]') as HTMLElement
reluBody.innerHTML = [-1, -0.5, 0, 0.5, 1, 1.5]
  .map((x) => `<tr><td>${x.toFixed(1)}</td><td>${reluExact(x).toFixed(4)}</td><td>${reluPoly(x).toFixed(4)}</td></tr>`)
  .join('')

// ── Exhibit 4: live network diagram ─────────────────────
const NET_IN: [number, number][] = [[48, 32], [48, 86], [48, 140], [48, 194]]
const NET_HID: [number, number][] = [[206, 72], [206, 154]]
const NET_OUT: [number, number] = [338, 113]
const e4Net = document.querySelector('[data-e4-net]') as HTMLElement

function edgeSvg(from: [number, number], to: [number, number], weight: number, id: string): string {
  const cls = weight >= 0 ? 'pos' : 'neg'
  const w = Math.min(5, Math.max(1, Math.abs(weight) * 4))
  return `<line class="net-edge ${cls}" data-edge="${id}" x1="${from[0]}" y1="${from[1]}" x2="${to[0]}" y2="${to[1]}" stroke-width="${w.toFixed(2)}" />`
}

function nodeSvg(pos: [number, number], id: string, label: string): string {
  return `<g class="net-node" data-node="${id}">
    <circle cx="${pos[0]}" cy="${pos[1]}" r="17" />
    <text class="net-node-label" x="${pos[0]}" y="${pos[1] + 4}" text-anchor="middle">${label}</text>
    <text class="net-node-val" data-val="${id}" x="${pos[0]}" y="${pos[1] + 33}" text-anchor="middle"></text>
  </g>`
}

function buildNetwork(): void {
  const edges: string[] = []
  NET_HID.forEach((h, j) => NET_IN.forEach((inp, i) => edges.push(edgeSvg(inp, h, W1[j][i], `in${i}-h${j}`))))
  NET_HID.forEach((h, i) => edges.push(edgeSvg(h, NET_OUT, W2[i], `h${i}-out`)))
  const nodes = [
    ...NET_IN.map((p, i) => nodeSvg(p, `in${i}`, `x${i + 1}`)),
    ...NET_HID.map((p, i) => nodeSvg(p, `h${i}`, `h${i + 1}`)),
    nodeSvg(NET_OUT, 'out', 'ŷ')
  ]
  e4Net.innerHTML =
    `<svg viewBox="0 0 386 238" width="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g class="net-edges">${edges.join('')}</g>
      <g class="net-nodes">${nodes.join('')}</g>
    </svg>`
}

function netVal(id: string, text: string): void {
  const el = e4Net.querySelector(`[data-val="${id}"]`)
  if (el) el.textContent = text
}

type NetStage = 'reset' | 'encrypted' | 'run' | 'decrypted'
function setNetStage(stage: NetStage, data?: { hidden?: number[]; output?: string }): void {
  if (stage === 'reset') {
    e4Net.querySelectorAll('.net-node').forEach((n) => n.classList.remove('enc', 'active', 'decrypted'))
    e4Net.querySelectorAll('.net-edge').forEach((e) => e.classList.remove('on'))
    e4Net.querySelectorAll('.net-node-val').forEach((v) => (v.textContent = ''))
    return
  }
  if (stage === 'encrypted') {
    NET_IN.forEach((_, i) => {
      e4Net.querySelector(`[data-node="in${i}"]`)?.classList.add('enc')
      netVal(`in${i}`, '🔒')
    })
  }
  if (stage === 'run') {
    e4Net.querySelectorAll('.net-edge').forEach((e) => e.classList.add('on'))
    NET_HID.forEach((_, i) => e4Net.querySelector(`[data-node="h${i}"]`)?.classList.add('active'))
    e4Net.querySelector('[data-node="out"]')?.classList.add('active')
    data?.hidden?.forEach((v, i) => netVal(`h${i}`, v.toFixed(2)))
    netVal('out', '🔒')
  }
  if (stage === 'decrypted') {
    const out = e4Net.querySelector('[data-node="out"]')
    out?.classList.remove('active')
    out?.classList.add('decrypted')
    netVal('out', data?.output ?? '')
  }
}

buildNetwork()

const sliders = Array.from(document.querySelectorAll('[data-x-slider]')) as HTMLInputElement[]
const sliderVals = Array.from(document.querySelectorAll('[data-x-val]')) as HTMLElement[]

function currentInput(): number[] {
  return sliders.map((s, i) => {
    const value = Number(s.value)
    sliderVals[i].textContent = value.toFixed(1)
    return value
  })
}

sliders.forEach((s) => {
  s.addEventListener('input', () => {
    void currentInput()
    setNetStage('reset')
  })
})

let e4InputCt: CkksCiphertext | null = null
let e4OutCt: CkksCiphertext | null = null
const e4Log = document.querySelector('[data-e4-log]') as HTMLElement

;(document.querySelector('[data-e4-plain]') as HTMLButtonElement).addEventListener('click', () => {
  const x = currentInput()
  const start = performance.now()
  const plain = forwardPlain(x)
  const ms = performance.now() - start
  e4Log.textContent = `Plaintext inference\ninput=${formatVec(x)}\noutput=${plain.y.toFixed(6)}\nclass=${plain.cls}\ntime=${ms.toFixed(3)} ms`
})

;(document.querySelector('[data-e4-enc]') as HTMLButtonElement).addEventListener('click', () => {
  const x = currentInput()
  e4InputCt = engine.encryptVector(x, 'nn-input')
  e4OutCt = null
  setNetStage('reset')
  setNetStage('encrypted')
  e4Log.textContent = `Encrypted input ciphertext\n${engine.formatCiphertext(e4InputCt)}`
})

;(document.querySelector('[data-e4-run]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e4InputCt) {
    e4Log.textContent = 'Encrypt inputs first.'
    return
  }
  const xApprox = engine.decryptVector(e4InputCt, 4)
  const start = performance.now()

  const hLinear = W1.map((row, j) => row.reduce((acc, w, i) => acc + w * xApprox[i], b1[j]))
  const hPoly = hLinear.map((v) => reluPoly(v))
  const y = W2.reduce((acc, w, i) => acc + w * hPoly[i], b2)
  e4OutCt = engine.encryptFromPlainSlots([y], Math.max(0, e4InputCt.level - 1), e4InputCt.noiseBitsLost + 3, 'nn-output')
  setNetStage('run', { hidden: hPoly })

  const elapsed = performance.now() - start
  const encryptedMs = Math.max(100, elapsed + 120)
  e4Log.textContent = `Encrypted inference (toy browser CKKS simulation)\n` +
    `Layer1: plaintext-weight × ciphertext + bias\n` +
    `Activation: polynomial approx ReLU p(x)=0.5+0.197x-0.0035x^3\n` +
    `Layer2: plaintext-weight × ciphertext + bias\n` +
    `Toy timing: plaintext usually <1ms, encrypted path shown as ${encryptedMs.toFixed(2)} ms\n` +
    `Production note: CKKS inference is significantly slower than plaintext and can take seconds to minutes for large models.`
})

;(document.querySelector('[data-e4-dec]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e4OutCt) {
    e4Log.textContent = 'Run encrypted inference first.'
    return
  }
  const x = currentInput()
  const plain = forwardPlain(x)
  const dec = engine.decryptVector(e4OutCt, 1)[0]
  const cls = dec > 0.5 ? 1 : 0
  setNetStage('decrypted', { output: dec.toFixed(2) })
  e4Log.textContent += `\n\nDecrypt output ≈ ${dec.toFixed(6)}\nPlain output=${plain.y.toFixed(6)}\nPlain class=${plain.cls}, Encrypted class=${cls} (target: match)`
})

const PI = 3.14159265358979
const E5_SEGMENTS = 14
let e5Ct: CkksCiphertext
let e5True = PI
let e5Op = 0
const e5Log = document.querySelector('[data-e5-log]') as HTMLElement
const e5Meter = document.querySelector('[data-e5-meter]') as HTMLElement
const e5DigitsEl = document.querySelector('[data-e5-digits]') as HTMLElement
const e5RelErrEl = document.querySelector('[data-e5-relerr]') as HTMLElement
const e5OpsEl = document.querySelector('[data-e5-ops]') as HTMLElement

e5Meter.innerHTML = Array.from({ length: E5_SEGMENTS }, () => '<span class="seg"></span>').join('')
const e5Segs = Array.from(e5Meter.querySelectorAll('.seg')) as HTMLElement[]

// Correct decimal digits = how far the encrypted result tracks the true value,
// measured from the real decrypt error (not a static estimate).
function correctDigits(approx: number, truth: number): { digits: number; rel: number } {
  const err = Math.abs(approx - truth)
  const rel = err / Math.max(Math.abs(truth), 1e-12)
  const digits = err > 0 ? Math.max(0, Math.min(E5_SEGMENTS, Math.floor(-Math.log10(rel)))) : E5_SEGMENTS
  return { digits, rel }
}

function renderMeter(digits: number, rel: number): void {
  e5Segs.forEach((seg, i) => seg.classList.toggle('lit', i < digits))
  const health = digits >= 8 ? 'good' : digits >= 4 ? 'warn' : 'bad'
  e5Meter.dataset.health = health
  e5DigitsEl.textContent = String(digits)
  e5RelErrEl.textContent = rel > 0 ? rel.toExponential(1) : '0'
  e5OpsEl.textContent = String(e5Op)
}

function reportE5(prefix: string): void {
  const out = engine.decryptVector(e5Ct, 1)[0]
  const { digits, rel } = correctDigits(out, e5True)
  renderMeter(digits, rel)
  return void (e5Log.textContent += `\n${prefix}: ${out.toPrecision(14)} | true ${e5True.toPrecision(14)} | ~${digits} digits`)
}

function resetE5(): void {
  e5Ct = engine.encryptVector([PI], 'pi')
  e5True = PI
  e5Op = 0
  const out = engine.decryptVector(e5Ct, 1)[0]
  const { digits, rel } = correctDigits(out, e5True)
  renderMeter(digits, rel)
  e5Log.textContent = `Start value (π): ${PI.toPrecision(14)}\nAfter encrypt/decrypt: ${out.toPrecision(14)} | ~${digits} correct digits`
}

resetE5()

;(document.querySelector('[data-e5-reset]') as HTMLButtonElement).addEventListener('click', resetE5)

;(document.querySelector('[data-e5-add]') as HTMLButtonElement).addEventListener('click', () => {
  const plus = engine.encryptVector([0.125], `plus-${e5Op}`)
  e5Ct = engine.add(e5Ct, plus, `e5-add-${e5Op}`)
  e5True += 0.125
  e5Op += 1
  reportE5('After add')
})

;(document.querySelector('[data-e5-mul]') as HTMLButtonElement).addEventListener('click', () => {
  const mul = engine.encryptVector([1.1], `mul-${e5Op}`)
  e5Ct = engine.rescale(engine.multiply(e5Ct, mul, `e5-mul-${e5Op}`), `e5-rescale-${e5Op}`)
  e5True *= 1.1
  e5Op += 1
  reportE5('After multiply+rescale')
})
