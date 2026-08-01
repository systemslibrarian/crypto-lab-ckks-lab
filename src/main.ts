import './style.css'
import { ToyCkksEngine } from './toyCkks'
import type { CkksCiphertext } from './types'

const engine = new ToyCkksEngine()
const app = document.querySelector('#app') as HTMLDivElement

app.innerHTML = `
  <div class="app">

    <!-- ── Hero ────────────────────────────────────────────── -->
    <header class="cl-hero">
      <div class="cl-hero-main">
        <h1 class="cl-hero-title">CKKS</h1>
        <p class="cl-hero-sub">FHE · approximate real-number arithmetic</p>
        <p class="cl-hero-desc">Encrypt real-number vectors, then homomorphically add, multiply, rescale, and run a 2-layer neural network on the ciphertexts — decrypting only the final approximate result.</p>
      </div>
      <aside class="cl-hero-why" aria-label="Why it matters">
        <span class="cl-hero-why-label">WHY IT MATTERS</span>
        <p class="cl-hero-why-text">CKKS is the practical path to encrypted ML inference: a cloud can score private medical, financial, or genomic data without ever decrypting it. Its bounded approximation is what makes real-valued FHE fast enough to ship.</p>
      </aside>
    </header>

    <!-- ── Narrative Introduction ──────────────────────────── -->
    <section class="narrative-intro">
      <p class="narrative-scenario">
        You are a developer building a medical AI service. Your users send private health data for inference.
        You need to run the model — but you must never see the plaintext data. CKKS makes this possible.
      </p>
      <p class="subtitle">
        CKKS is the <span class="tooltip-term" tabindex="0" data-tip="Fully Homomorphic Encryption allows computation on encrypted data without decrypting it first.">FHE</span> scheme
        purpose-built for approximate real-number arithmetic on encrypted data — the foundation of encrypted machine learning inference.
      </p>

      <div class="disclaimer">
        ⚠ Educational demo — toy parameters (n=8, 4 slots, Δ=2<sup>10</sup>). Not production-ready. Not externally audited.
      </div>

      <div class="callout" role="note">
        <strong>What's real here:</strong> this is a genuine (if tiny) CKKS implementation.
        Ciphertexts are real RLWE polynomial pairs (c0, c1) in Z<sub>q</sub>[x]/(x<sup>n</sup>+1);
        encoding uses the actual canonical embedding; homomorphic add, multiply (with
        relinearization) and rescale operate on those polynomials; and every "decrypted result"
        you see below is computed as <code>c0 + c1·s</code> and decoded — never read from a
        plaintext shortcut. The only thing that is <em>not</em> real is security: n=8 is far too
        small to be safe. Security comes from the (ring degree, modulus) pair, not n alone — the
        Homomorphic Encryption Standard v1.1 hits 128-bit classical security at n=4096 only for
        log q ≤ 109, and at n=8192 for log q ≤ 218. A useful CKKS modulus chain needs more than 109
        bits, so n ≥ 8192 is the practical rule of thumb. Do not use this code for anything real.
      </div>

      <!-- Decision Panel -->
      <details class="go-deeper">
        <summary>Should I use CKKS? (best-for / avoid / tradeoffs)</summary>
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
            <li>Ciphertexts are large: 2·n·log q bits, so ≈440 KB at n=8192 (log q ≤ 218) and ≈1.8 MB at n=16384 (log q ≤ 438)</li>
            <li>10×–10,000× slower than plaintext computation</li>
          </ul>
        </div>
        <div class="decision-complexity">
          <h3>🔥 Complexity: Advanced</h3>
          <p>Requires understanding: polynomial rings, scale management, noise budgets, RLWE security assumptions.</p>
          <p><strong>Prerequisites:</strong> symmetric encryption, public-key concepts, basic abstract algebra.</p>
        </div>
      </div>
      </details>

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
        <h2 id="e1-heading">Exhibit 1: Encrypt a Number, Compute on It, Get It Back</h2>

        <p class="exhibit-hook">
          <strong>CKKS lets a server do math on your numbers without ever seeing them.</strong>
          Encrypt a real number, and it comes back <em>almost</em> exactly right — the tiny gap is the whole point of the scheme.
        </p>

        <div class="firsttry">
          <div class="firsttry-row" role="group" aria-label="First encryption">
            <label for="e1-value">Your number</label>
            <input id="e1-value" type="text" inputmode="decimal" value="3.14" aria-describedby="e1-hint" />
            <button class="action" data-e1-run>Encrypt → decrypt</button>
          </div>
          <p id="e1-hint" class="note">One click encrypts it under a real RLWE key, then decrypts it back. Nothing else runs yet.</p>
          <div class="firsttry-out" data-e1-out aria-live="polite" role="status">
            → Click to see <code>3.14</code> make the encrypt / decrypt round-trip.
          </div>
        </div>

        <details class="go-deeper">
          <summary>Go deeper: why approximate, the FHE family, and the RLWE foundation</summary>

        <div class="phase-label">The core concept</div>
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
          <div class="phase-label">Why it matters</div>
          <div class="callout" role="note">
            <strong>Why this matters:</strong> CKKS is the practical FHE path for encrypted ML inference, and
            Microsoft SEAL, OpenFHE, HEAAN and Lattigo all implement it. (CryptoNets, ICML 2016, is the ancestor of
            this line of work but <em>not</em> a CKKS system — it predates the 2017 CKKS paper and ran on SEAL's
            leveled exact-integer scheme, quantising its network to integers.)
            If you are evaluating a neural network on encrypted real-valued user data, CKKS is your scheme.
          </div>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">When you'd actually use this</div>
          <ul>
            <li><strong>Cloud ML inference</strong> — A hospital sends encrypted patient features; the cloud runs a diagnostic model without seeing the data.</li>
            <li><strong>Encrypted analytics</strong> — Compute mean/variance on encrypted salary data across organizations.</li>
            <li><strong>Privacy-preserving genomics</strong> — Run statistical tests on encrypted DNA sequences.</li>
          </ul>
        </div>

        <div class="exhibit-section">
          <div class="phase-label phase-label-orange">Tradeoffs &amp; warnings</div>
          <ul>
            <li>⚠ Approximation error accumulates — deep computation chains lose precision.</li>
            <li>⚠ Not suitable for exact arithmetic (financial calculations, vote counting).</li>
            <li>⚠ Production ciphertexts are megabytes; latency is orders of magnitude above plaintext.</li>
          </ul>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">Explore the FHE family</div>
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
        </details>
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
          <div class="phase-label">B — Watch 4 numbers become one polynomial</div>
          <p class="note">
            Before encrypting, CKKS <strong>encodes</strong>: the
            <span class="tooltip-term" tabindex="0" data-tip="The canonical embedding (a special complex FFT over the primitive 2n-th roots of x^n+1). It turns a length-n/2 vector into ONE integer polynomial of degree n whose evaluation at those roots reproduces the slots.">canonical embedding</span>
            spreads your 4 slot values across all 8 integer coefficients of a single polynomial.
            Type values, then encode &amp; encrypt to see the exact numbers flow.
          </p>
          <div class="row" role="group" aria-label="Encoding visualizer inputs">
            <label for="e2-encvec" class="inline-label">4 real values</label>
            <input id="e2-encvec" type="text" value="1.5, 2.7, 3.2, 0.8" style="max-width:16rem" />
            <button class="action" data-e2-encode>Encode &amp; encrypt</button>
          </div>
          <div class="encflow" data-e2-encflow aria-live="polite">
            <p class="note">→ Click “Encode &amp; encrypt” to watch the slots become polynomial coefficients.</p>
          </div>
          <p class="note encflow-caption" data-e2-encflow-caption></p>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">C — Now add two encrypted vectors</div>
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

          <div class="row" role="group" aria-label="Ciphertext view mode">
            <span class="viewmode-label" id="e2-view-label">Ciphertext view:</span>
            <button class="action ctview-btn is-active" data-e2-view="signal" aria-pressed="true">Signal + noise</button>
            <button class="action ctview-btn" data-e2-view="hex" aria-pressed="false">Raw hex</button>
          </div>
          <p class="note" data-e2-view-hint>
            <strong>Signal + noise:</strong> the first line is the ideal encoded polynomial; the second is
            <code>c0 + c1·s</code> — what decryption actually recovers (the same signal plus the RLWE error, ±1 at these
            parameters). The <code>c0</code> and <code>c1</code> lines under it are the stored ciphertext halves: each is
            masked and its coefficients are spread across the full range (−q/2, q/2], so on its own neither reveals
            anything. That is the RLWE assumption — the signal only reappears when the secret key recombines them.
          </p>

          <div class="grid-2">
            <div>
              <h3>ct(A)</h3>
              <pre class="mono" data-e2-cta tabindex="0" role="region" aria-label="Ciphertext A coefficients" aria-live="polite" aria-atomic="true">→ Click "Encrypt A" to begin</pre>
            </div>
            <div>
              <h3>ct(B)</h3>
              <pre class="mono" data-e2-ctb tabindex="0" role="region" aria-label="Ciphertext B coefficients" aria-live="polite" aria-atomic="true">→ Click "Encrypt B"</pre>
            </div>
          </div>
          <h3>ct(A + B)</h3>
          <pre class="mono" data-e2-sum tabindex="0" role="region" aria-label="Sum ciphertext coefficients" aria-live="polite" aria-atomic="true">→ Add both ciphertexts, then decrypt</pre>

          <div class="tamper" role="group" aria-label="Tamper with a coefficient">
            <span class="tamper-title">Prove it's real — corrupt one coefficient of ct(A+B):</span>
            <div class="row">
              <label for="e2-tamper-idx" class="inline-label">coefficient #</label>
              <select id="e2-tamper-idx" data-e2-tamper-idx>
                <option>0</option><option>1</option><option>2</option><option>3</option>
                <option>4</option><option>5</option><option>6</option><option>7</option>
              </select>
              <button class="action action-orange" data-e2-tamper>+2048 &amp; decrypt</button>
            </div>
            <p class="note" data-e2-tamper-out aria-live="polite">Add both ciphertexts first, then nudge a coefficient and watch a slot drift.</p>
          </div>

          <p data-e2-out aria-live="polite" role="status">Expected: [2.0, 4.0, 6.0, 4.9]</p>

          <h3>All 4 slots ride in one ciphertext (SIMD)</h3>
          <div class="simd-bracket" data-e2-simd aria-label="Scale visualizer for all four slots">
            <div class="note">→ Decrypt the sum to fill all four SIMD lanes at once.</div>
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

          <!-- Depth-budget pipeline: modulus chain + scale bar + ciphertext degree -->
          <div class="pipeline" aria-label="CKKS depth pipeline">
            <div class="pipe-block">
              <div class="pipe-label">Modulus chain — each rescale drops one modulus</div>
              <div class="modchain" data-e3-modchain role="img" aria-label="Modulus chain levels"></div>
              <p class="note pipe-hint">
                Fresh ciphertexts start at the top level (largest modulus). <strong>depth left = level number = multiplications
                still available</strong>, because every multiply must be followed by a rescale that drops one modulus.
                This toy chain is 2<sup>50</sup>–2<sup>40</sup>–2<sup>30</sup>–2<sup>20</sup>: powers of two, chosen so the
                arithmetic is readable. Production CKKS instead uses a chain of distinct NTT-friendly <em>primes</em>
                q<sub>i</sub> ≡ 1 (mod 2n), each ≈ Δ, so the modulus can be held in RNS form and rescaling is an exact
                division by one prime.
              </p>
            </div>
            <div class="pipe-block">
              <div class="pipe-label">Scale — multiply doubles it to Δ², rescale halves it back to Δ</div>
              <div class="scalebar" data-e3-scalebar role="img" aria-label="Current ciphertext scale">
                <div class="scalebar-fill" data-e3-scalefill></div>
                <span class="scalebar-txt" data-e3-scaletxt>Δ</span>
              </div>
            </div>
            <div class="pipe-block">
              <div class="pipe-label">Ciphertext degree — multiply makes (c0,c1,c2); relinearize collapses it back to (c0,c1)</div>
              <div class="degree-view" data-e3-degree role="img" aria-label="Ciphertext degree stage">
                <span class="deg-part">c0</span><span class="deg-part">c1</span><span class="deg-part deg-c2" data-e3-c2>c2</span>
              </div>
            </div>
          </div>

          <pre class="mono" data-e3-ct tabindex="0" role="region" aria-label="Exhibit 3 ciphertext" aria-live="polite" aria-atomic="true">→ Encrypt, then multiply</pre>
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
            <span class="tooltip-term" tabindex="0" data-tip="Bootstrapping refreshes a ciphertext's modulus levels so more operations can be performed. It is by far the most expensive operation in CKKS: tens of seconds per ciphertext (18 s for 32768 slots in Bossuat et al., EUROCRYPT 2021), though only ~0.5 ms amortized per slot.">bootstrapping</span>
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
          <p class="note">Architecture: 4 inputs → 2 hidden neurons (polynomial activation) → 1 output.
            ReLU replaced by a degree-2 least-squares fit: p(x) = 0.0946 + 0.5x + 0.4642x².
            A quadratic keeps the whole forward pass within the toy modulus chain's depth budget.</p>
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
          <pre class="mono" data-e4-log tabindex="0" role="region" aria-label="Exhibit 4 inference log" aria-live="polite" aria-atomic="true">→ Adjust sliders, then encrypt and run</pre>

          <h3>Where the polynomial diverges from true ReLU</h3>
          <figure class="relu-figure">
            <div class="relu-chart" data-e4-relu-chart role="img"
                 aria-label="Overlay of true ReLU (a hinge at zero) and the degree-2 polynomial approximation. The two curves match near zero and diverge toward the ends of the range; the shaded band is the approximation error.">
            </div>
            <figcaption class="relu-legend">
              <span><span class="relu-swatch relu"></span> true ReLU</span>
              <span><span class="relu-swatch poly"></span> degree-2 poly p(x)</span>
              <span><span class="relu-swatch gap"></span> approximation error</span>
            </figcaption>
          </figure>
          <p class="note" data-e4-relu-caption>
            The quadratic hugs ReLU near x=0 but drifts at the edges — that gap is exactly the plaintext-vs-encrypted
            output difference you see on decrypt. Run the encrypted pass to mark each hidden pre-activation on the curve.
          </p>

          <div class="table-wrap">
            <table aria-label="ReLU vs polynomial approximation">
              <thead><tr><th scope="col">x</th><th scope="col">ReLU(x)</th><th scope="col">Poly approx</th><th scope="col">Error</th></tr></thead>
              <tbody data-e4-relu-table></tbody>
            </table>
          </div>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">C — What just happened</div>
          <p>
            The server multiplied encrypted inputs by plaintext weights (a cheaper operation than ciphertext × ciphertext),
            summed the encrypted products, rescaled, added biases, then evaluated the polynomial activation — whose x² term
            is a genuine ciphertext × ciphertext multiplication followed by relinearization and rescaling. The output layer
            repeated the weighted-sum step. Every intermediate value stayed a ciphertext; only the final result was decrypted,
            client-side, via <code>c0 + c1·s</code>. At no point was any input decrypted on the server.
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
            Be precise about what has actually shipped, though: encrypted inference is still mostly research and pilots
            (CryptoNets and its successors, encrypted genomic analysis in the iDASH competitions). The largest
            production homomorphic-encryption deployment to date — Apple's Live Caller ID Lookup — is
            <em>not</em> CKKS and not inference: it is server-side private information retrieval built on
            <strong>BFV</strong> (Apple's open-source swift-homomorphic-encryption implements BFV only).
            Production CKKS systems use n=16384 or higher with carefully optimized polynomial approximations.
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
          <p class="note">Starting value: π (3.14159265358979). Track how correct digits decrease with each operation.
            Adds are unlimited; multiplies are not — each one spends a level, and this toy chain only has three to spend.</p>
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
          <pre class="mono" data-e5-log tabindex="0" role="region" aria-label="Exhibit 5 precision log" aria-live="polite" aria-atomic="true">→ Click Reset, then add/multiply repeatedly</pre>
        </div>

        <div class="exhibit-section">
          <div class="phase-label">C — What just happened</div>
          <p>
            <strong>Encoding error</strong> is ~1/Δ (limited by how finely we quantize reals to integers).
            <strong>RLWE noise</strong> adds stochastic error during encryption.
            Each <strong>rescaling</strong> loses additional precision bits by dividing coefficients.
            Two distinct things end a CKKS computation, and they fail differently: noise growing until it swamps the
            signal (a gradual loss of correct digits, which is what the meter above tracks), and the modulus chain
            running out (an abrupt cliff — no modulus is left to rescale into, so the next product wraps around q and
            the answer is destroyed rather than degraded). At these toy parameters you reach the cliff first, after
            three multiplies; the demo refuses the fourth rather than printing a number it knows is meaningless.
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
            Bootstrapping cost (parameter/hardware dependent): TFHE ~10ms per gate bootstrap; BGV/BFV seconds to minutes;
            CKKS <strong>tens of seconds per ciphertext</strong> — Bossuat et al. (EUROCRYPT 2021) report 18 s to bootstrap
            a 32768-slot ciphertext, which is only ~0.55 ms <em>amortized per slot</em>. CKKS bootstrapping looks cheap per
            value and expensive per operation; quoting the amortized figure as if it were the latency is a common error.
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
          <p>A computationally bounded adversary who observes ciphertexts and evaluation keys but not the secret key. Security relies on the hardness of the
            <span class="tooltip-term" tabindex="0" data-tip="Ring Learning With Errors: given (a, a·s + e mod q) for random a and small error e, it is computationally hard to recover the secret s.">RLWE</span> problem.
            Note that this demo encrypts <em>symmetrically</em>: <code>encryptVector</code> forms c0 = m − a·s + e directly
            from the secret key, and there is no public key anywhere in the code. Deployed CKKS publishes a public key
            (an RLWE encryption of zero) so anyone can encrypt; that changes who can produce ciphertexts, not what an
            attacker who only sees them can learn.</p>
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
        ⚠ This is an educational toy implementation with n=8. 128-bit security is set by the (n, log q) pair — the
        HE Standard permits n=4096 only up to log q ≤ 109 — so production CKKS uses n ≥ 8192 to afford a real modulus chain.
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

// ── Exhibit 1: first-try encrypt→decrypt round-trip ─────
const e1Out = document.querySelector('[data-e1-out]') as HTMLElement
;(document.querySelector('[data-e1-run]') as HTMLButtonElement).addEventListener('click', () => {
  const raw = (document.getElementById('e1-value') as HTMLInputElement).value
  const v = Number(raw.trim())
  if (!Number.isFinite(v)) {
    e1Out.textContent = 'Enter a single real number (e.g. 3.14).'
    return
  }
  const ct = engine.encryptVector([v], 'e1')
  const back = engine.decryptVector(ct, 1)[0]
  const err = Math.abs(back - v)
  e1Out.innerHTML =
    `<span class="e1-flow"><span class="e1-chip">${v}</span> <span class="e1-arrow">→ encrypt →</span> ` +
    `<span class="e1-chip enc">🔒 RLWE ciphertext</span> <span class="e1-arrow">→ decrypt →</span> ` +
    `<span class="e1-chip out">${back.toFixed(4)}</span></span>` +
    `<span class="e1-note">Off by ${engine.scientific(err)} — that gap is CKKS's deliberate approximation, ` +
    `not a bug. At production scale (Δ=2<sup>40</sup>) it shrinks to ~10<sup>-12</sup>.</span>`
})

// ── Exhibit 2: encoding visualizer (slots → coeffs → +noise) ─
const e2EncFlow = document.querySelector('[data-e2-encflow]') as HTMLElement
const e2EncCap = document.querySelector('[data-e2-encflow-caption]') as HTMLElement

function coeffBoxes(vals: bigint[], cls: string, deltas?: bigint[]): string {
  return vals
    .map((v, i) => {
      const changed = deltas && deltas[i] !== 0n ? ' changed' : ''
      return `<span class="cbox ${cls}${changed}">${v.toString()}</span>`
    })
    .join('')
}

;(document.querySelector('[data-e2-encode]') as HTMLButtonElement).addEventListener('click', () => {
  const vals = parseVector((document.getElementById('e2-encvec') as HTMLInputElement).value, 4)
  const t = engine.encodeTrace(vals)
  const slotBoxes = t.slots.map((v, i) => `<span class="cbox slot">s${i}=${v}</span>`).join('')
  e2EncFlow.innerHTML =
    `<div class="encrow"><span class="encrow-label">4 input slots (your reals)</span>` +
    `<div class="cboxes">${slotBoxes}</div></div>` +
    `<div class="encarrow" aria-hidden="true">↓ canonical embedding × Δ=${engine.params.baseScale}</div>` +
    `<div class="encrow"><span class="encrow-label">8 encoded coefficients (integers)</span>` +
    `<div class="cboxes">${coeffBoxes(t.coeffs, 'coeff')}</div></div>` +
    `<div class="encarrow" aria-hidden="true">↓ encrypt: add RLWE error e</div>` +
    `<div class="encrow"><span class="encrow-label">same coefficients, after encryption (signal + noise)</span>` +
    `<div class="cboxes">${coeffBoxes(t.noisy, 'noisy', t.delta)}</div></div>` +
    `<div class="encrow"><span class="encrow-label">per-coefficient noise added (highlighted above)</span>` +
    `<div class="cboxes">${coeffBoxes(t.delta, 'delta')}</div></div>`
  const maxNoise = t.delta.reduce((m, d) => (d > m ? d : -d > m ? -d : m), 0n)
  e2EncCap.innerHTML =
    `Every slot value is spread across all 8 coefficients — that is the canonical embedding. ` +
    `Encryption then perturbs each coefficient by at most ±${maxNoise.toString()} ` +
    `(tiny next to Δ=${engine.params.baseScale}), which is why decode still recovers the reals.`
})

let e2A: CkksCiphertext | null = null
let e2B: CkksCiphertext | null = null
let e2Sum: CkksCiphertext | null = null
let e2View: 'signal' | 'hex' = 'signal'
const e2Cta = document.querySelector('[data-e2-cta]') as HTMLElement
const e2Ctb = document.querySelector('[data-e2-ctb]') as HTMLElement
const e2SumEl = document.querySelector('[data-e2-sum]') as HTMLElement
const e2Out = document.querySelector('[data-e2-out]') as HTMLElement
const e2Simd = document.querySelector('[data-e2-simd]') as HTMLElement
const e2TamperOut = document.querySelector('[data-e2-tamper-out]') as HTMLElement
const e2ViewHint = document.querySelector('[data-e2-view-hint]') as HTMLElement

// Render one ciphertext in the currently-selected view.
//
// "signal" shows what decryption actually recovers: the centered coefficients of
// c0 + c1·s, i.e. the encoded signal plus the RLWE error term. It deliberately
// does NOT pretend c0 alone is "signal + noise" — c0 = m − a·s + e is masked by
// a·s and its coefficients are spread across the whole range (−q/2, q/2], which
// is exactly why RLWE hides the message. Both halves are printed below so the
// contrast is visible. "hex" is the raw stored dump.
function renderCt(ct: CkksCiphertext, ideal?: number[]): string {
  if (e2View === 'hex') return engine.formatCiphertext(ct)
  const { c0, c1 } = engine.centeredCoeffs(ct)
  const row = (v: bigint[]): string => v.map((x) => x.toString()).join(' ')
  const lines = [`label=${ct.label}, level=${ct.level}, scale=${ct.scale}`]
  if (ideal) lines.push(`signal (ideal encode):   ${row(engine.encode(ideal))}`)
  lines.push(`c0 + c1·s (decrypts to): ${row(engine.decryptPoly(ct))}`)
  lines.push(`c0 (masked by a·s):      ${row(c0)}`)
  lines.push(`c1 (the mask a):         ${row(c1)}`)
  return lines.join('\n')
}

function refreshE2Views(): void {
  const a = parseVector((document.getElementById('vec-a') as HTMLInputElement).value)
  const b = parseVector((document.getElementById('vec-b') as HTMLInputElement).value)
  if (e2A) e2Cta.textContent = renderCt(e2A, a)
  if (e2B) e2Ctb.textContent = renderCt(e2B, b)
  if (e2Sum) e2SumEl.textContent = renderCt(e2Sum, a.map((v, i) => v + b[i]))
}

;(Array.from(document.querySelectorAll('[data-e2-view]')) as HTMLButtonElement[]).forEach((btn) => {
  btn.addEventListener('click', () => {
    e2View = btn.dataset.e2View === 'hex' ? 'hex' : 'signal'
    document.querySelectorAll('[data-e2-view]').forEach((b) => {
      const active = (b as HTMLElement).dataset.e2View === e2View
      b.classList.toggle('is-active', active)
      b.setAttribute('aria-pressed', String(active))
    })
    e2ViewHint.innerHTML =
      e2View === 'signal'
        ? '<strong>Signal + noise:</strong> the first line is the ideal encoded polynomial; the second is <code>c0 + c1·s</code> — what decryption actually recovers (the same signal plus the RLWE error, ±1 at these parameters). The <code>c0</code> and <code>c1</code> lines under it are the stored ciphertext halves: each is masked and its coefficients are spread across the full range (−q/2, q/2], so on its own neither reveals anything. That is the RLWE assumption — the signal only reappears when the secret key recombines them.'
        : '<strong>Raw hex:</strong> the ciphertext polynomials (c0, c1) as stored — integers modulo q, shown in hex. Unreadable by design; switch back to Signal + noise to see what the secret key recovers.'
    refreshE2Views()
  })
})

;(document.querySelector('[data-e2-enc-a]') as HTMLButtonElement).addEventListener('click', () => {
  const a = parseVector((document.getElementById('vec-a') as HTMLInputElement).value)
  e2A = engine.encryptVector(a, 'A')
  e2Cta.textContent = renderCt(e2A, a)
  e2Out.textContent = `A encoded slots: ${formatVec(a)} using Delta=${engine.params.baseScale}`
})

;(document.querySelector('[data-e2-enc-b]') as HTMLButtonElement).addEventListener('click', () => {
  const b = parseVector((document.getElementById('vec-b') as HTMLInputElement).value)
  e2B = engine.encryptVector(b, 'B')
  e2Ctb.textContent = renderCt(e2B, b)
})

;(document.querySelector('[data-e2-add]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e2A || !e2B) {
    e2Out.textContent = 'Encrypt A and B first.'
    return
  }
  const a = parseVector((document.getElementById('vec-a') as HTMLInputElement).value)
  const b = parseVector((document.getElementById('vec-b') as HTMLInputElement).value)
  e2Sum = engine.add(e2A, e2B, 'A+B')
  e2SumEl.textContent = renderCt(e2Sum, a.map((v, i) => v + b[i]))
  e2Out.textContent = 'Ciphertext addition done for all 4 slots in one SIMD operation.'
})

function renderSimd(a: number[], b: number[], actual: number[]): void {
  const s = engine.params.baseScale
  const rows = a
    .map((av, i) => {
      const bv = b[i]
      const encA = Math.round(av * s)
      const encB = Math.round(bv * s)
      return (
        `<div class="simd-lane"><span class="lane-tag">slot ${i}</span>` +
        `<span class="lane-calc">${av} × ${s} = ${encA} &nbsp;+&nbsp; ${bv} × ${s} = ${encB}` +
        ` &nbsp;→&nbsp; ${encA + encB}/${s} = <strong>${((encA + encB) / s).toFixed(3)}</strong></span>` +
        `<span class="lane-dec">decrypted ≈ ${actual[i].toFixed(4)}</span></div>`
      )
    })
    .join('')
  e2Simd.innerHTML =
    `<div class="simd-inner">${rows}</div>` +
    `<div class="simd-note">One ciphertext, one add — all 4 lanes moved together (SIMD / batching). ` +
    `These are <em>slot</em> values at scale Δ, not the polynomial coefficients: the slot holds v·Δ as a fixed-point ` +
    `integer, while the canonical embedding in panel B spreads every slot across all ${engine.params.n} coefficients.</div>`
}

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
  renderSimd(a, b, actual)
})

;(document.querySelector('[data-e2-tamper]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e2Sum) {
    e2TamperOut.textContent = 'Add both ciphertexts first, then tamper.'
    return
  }
  const idx = Number((document.getElementById('e2-tamper-idx') as HTMLSelectElement).value)
  const a = parseVector((document.getElementById('vec-a') as HTMLInputElement).value)
  const b = parseVector((document.getElementById('vec-b') as HTMLInputElement).value)
  const before = engine.decryptVector(e2Sum, 4)
  const tampered = engine.tamperC0(e2Sum, idx, BigInt(2 * engine.params.baseScale))
  const after = engine.decryptVector(tampered, 4)
  const drift = after.map((v, i) => v - before[i])
  const worst = drift.reduce((m, d, i) => (Math.abs(d) > Math.abs(drift[m]) ? i : m), 0)
  e2SumEl.textContent = renderCt(tampered, a.map((v, i) => v + b[i]))
  e2TamperOut.innerHTML =
    `Nudged coefficient #${idx} of c0 by +${2 * engine.params.baseScale}. ` +
    `Because decryption is <code>c0 + c1·s</code>, the recovered slots shifted: ` +
    `slot ${worst} moved from ${before[worst].toFixed(4)} to <strong>${after[worst].toFixed(4)}</strong>. ` +
    `A plaintext shortcut could never do this — the crypto is real.`
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

// ── Exhibit 3 pipeline (modulus chain + scale bar + degree) ──
const e3ModchainEl = document.querySelector('[data-e3-modchain]') as HTMLElement
const e3ScaleFill = document.querySelector('[data-e3-scalefill]') as HTMLElement
const e3ScaleTxt = document.querySelector('[data-e3-scaletxt]') as HTMLElement
const e3DegreeEl = document.querySelector('[data-e3-degree]') as HTMLElement
const e3C2El = document.querySelector('[data-e3-c2]') as HTMLElement
// One chip per modulus in the chain, top prime = top level. Highlights the
// current level; dims (drops) every level below it.
function renderModchain(level: number | null): void {
  const chain = engine.params.modChain
  e3ModchainEl.innerHTML = chain
    .map((q, idx) => {
      const lvl = chain.length - 1 - idx // modChain[0] is top level
      let cls = 'mod-chip'
      if (level === null) cls += ''
      else if (lvl === level) cls += ' current'
      else if (lvl > level) cls += ' dropped'
      const bits = Math.round(Math.log2(q))
      return `<span class="${cls}"><span class="mod-lvl">L${lvl}</span><span class="mod-q">2^${bits}</span></span>`
    })
    .join('<span class="mod-link" aria-hidden="true">–</span>')
}

// degree: 1 => (c0,c1); 2 => (c0,c1,c2). scaleState: 'd' | 'd2'.
function renderPipeline(scaleState: 'd' | 'd2', degree: 1 | 2): void {
  e3ScaleFill.style.width = scaleState === 'd2' ? '100%' : '50%'
  e3ScaleTxt.textContent = scaleState === 'd2' ? 'Δ² (double)' : 'Δ'
  e3ScaleFill.classList.toggle('is-hot', scaleState === 'd2')
  e3C2El.classList.toggle('show', degree === 2)
  e3DegreeEl.classList.toggle('is-deg2', degree === 2)
}

renderModchain(null)
renderPipeline('d', 1)

function updateE3State(ct: CkksCiphertext | null, status: string): void {
  const stateEl = document.querySelector('[data-e3-state]') as HTMLElement
  if (!ct) {
    e3ScaleEl.textContent = '—'
    e3LevelEl.textContent = '—'
    e3BudgetEl.textContent = '—'
    e3StatusEl.textContent = status
    stateEl.classList.remove('is-exhausted')
    renderModchain(null)
    renderPipeline('d', 1)
    return
  }
  const grewScale = ct.scale > engine.params.baseScale
  e3ScaleEl.textContent = grewScale ? `${fmtScale(ct.scale)} (Δ²)` : `${fmtScale(ct.scale)} (Δ)`
  e3LevelEl.textContent = String(ct.level)
  e3BudgetEl.textContent = ct.level > 0 ? `${ct.level} mult` : 'exhausted'
  e3StatusEl.textContent = status
  stateEl.classList.toggle('is-exhausted', ct.level === 0)
  renderModchain(ct.level)
}

;(document.querySelector('[data-e3-enc]') as HTMLButtonElement).addEventListener('click', () => {
  const a = parseVector((document.getElementById('mul-a') as HTMLInputElement).value, 2)
  const b = parseVector((document.getElementById('mul-b') as HTMLInputElement).value, 2)
  e3A = engine.encryptVector(a, 'mul-A')
  e3B = engine.encryptVector(b, 'mul-B')
  e3Mul = null
  e3Ct.textContent = `ct(A):\n${engine.formatCiphertext(e3A)}\n\nct(B):\n${engine.formatCiphertext(e3B)}`
  e3Out.textContent = `Encrypted A and B at level ${e3A.level} (top of the chain, ${e3A.level} multiplications available). Current scale=Delta.`
  renderPipeline('d', 1)
  updateE3State(e3A, 'Fresh ciphertext')
})

;(document.querySelector('[data-e3-mul]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e3A || !e3B) {
    e3Out.textContent = 'Encrypt A and B first.'
    return
  }
  e3Mul = engine.multiply(e3A, e3B, 'mul(A,B)')
  e3Ct.textContent = engine.formatCiphertext(e3Mul)
  e3Out.textContent =
    `Stage 1 — MULTIPLY: the tensor product makes a degree-2 ciphertext (c0,c1,c2) and the scale doubles to Δ².\n` +
    `Stage 2 — RELINEARIZE: the evaluation key folds c2 back in, returning a normal (c0,c1) pair (shown below).\n` +
    `Next: rescale to halve the scale back to Δ and drop one modulus level.`
  // Show the transient degree-2 (c2 appears) then collapse to degree-1 to make
  // the relinearization step visible. The engine has already relinearized; this
  // animation narrates the two internal stages of a single multiply().
  renderPipeline('d2', 2)
  updateE3State(e3Mul, 'Multiplied → Δ², degree 2 (c0,c1,c2)')
  window.setTimeout(() => {
    renderPipeline('d2', 1)
    updateE3State(e3Mul, 'Relinearized → back to (c0,c1); rescale needed')
  }, 900)
})

;(document.querySelector('[data-e3-rescale]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e3Mul) {
    e3Out.textContent = 'Run multiply first.'
    return
  }
  const prevLevel = e3Mul.level
  e3Mul = engine.rescale(e3Mul, 'rescaled(mul(A,B))')
  e3Ct.textContent = engine.formatCiphertext(e3Mul)
  e3Out.textContent =
    `Stage 3 — RESCALE: divide by Δ (scale Δ² → Δ) and drop modulus L${prevLevel} from the chain.\n` +
    `Level ${prevLevel} → ${e3Mul.level}. Depth left is now ${e3Mul.level} multiplication${e3Mul.level === 1 ? '' : 's'}.`
  renderPipeline('d', 1)
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

// Degree-2 polynomial activation p(x) = A0 + A1·x + A2·x² (least-squares fit to
// ReLU on [-1, 1]). A quadratic is used deliberately: it needs only ONE
// multiplicative level, so the whole 2-layer forward pass fits the toy modulus
// chain and runs end-to-end on ciphertext without exhausting the depth budget.
const ACT = { a0: 0.0946, a1: 0.5, a2: 0.4642 }

function reluExact(x: number): number {
  return Math.max(0, x)
}

function actPoly(x: number): number {
  return ACT.a0 + ACT.a1 * x + ACT.a2 * x * x
}

function forwardPlain(x: number[]): { y: number; cls: number } {
  const h = W1.map((row, j) => actPoly(row.reduce((acc, w, i) => acc + w * x[i], b1[j])))
  const y = W2.reduce((acc, w, i) => acc + w * h[i], b2)
  return { y, cls: y > 0.5 ? 1 : 0 }
}

const reluBody = document.querySelector('[data-e4-relu-table]') as HTMLElement
reluBody.innerHTML = [-1, -0.5, 0, 0.5, 1, 1.5]
  .map((x) => {
    const gap = actPoly(x) - reluExact(x)
    return `<tr><td>${x.toFixed(1)}</td><td>${reluExact(x).toFixed(4)}</td><td>${actPoly(x).toFixed(4)}</td><td>${gap >= 0 ? '+' : ''}${gap.toFixed(4)}</td></tr>`
  })
  .join('')

// ── Exhibit 4: overlaid ReLU vs polynomial curve ────────
const RELU_X0 = -1.2
const RELU_X1 = 1.6
const RELU_W = 360
const RELU_H = 170
const RELU_PAD = 24
function reluChartX(x: number): number {
  return RELU_PAD + ((x - RELU_X0) / (RELU_X1 - RELU_X0)) * (RELU_W - 2 * RELU_PAD)
}
// y-range covers both curves comfortably on [-0.2, ~1.7].
const RELU_Y0 = -0.25
const RELU_Y1 = 1.75
function reluChartY(y: number): number {
  return RELU_H - RELU_PAD - ((y - RELU_Y0) / (RELU_Y1 - RELU_Y0)) * (RELU_H - 2 * RELU_PAD)
}
const e4ReluChart = document.querySelector('[data-e4-relu-chart]') as HTMLElement

function reluPath(fn: (x: number) => number): string {
  const pts: string[] = []
  for (let i = 0; i <= 60; i += 1) {
    const x = RELU_X0 + ((RELU_X1 - RELU_X0) * i) / 60
    pts.push(`${reluChartX(x).toFixed(1)},${reluChartY(fn(x)).toFixed(1)}`)
  }
  return pts.join(' ')
}

function gapPolygon(): string {
  const top: string[] = []
  const bottom: string[] = []
  for (let i = 0; i <= 60; i += 1) {
    const x = RELU_X0 + ((RELU_X1 - RELU_X0) * i) / 60
    top.push(`${reluChartX(x).toFixed(1)},${reluChartY(actPoly(x)).toFixed(1)}`)
    bottom.push(`${reluChartX(x).toFixed(1)},${reluChartY(reluExact(x)).toFixed(1)}`)
  }
  return top.concat(bottom.reverse()).join(' ')
}

function buildReluChart(marks: number[] = []): void {
  const x0 = reluChartX(0)
  const axisY = reluChartY(0)
  const markSvg = marks
    .map((x) => {
      const cx = reluChartX(x)
      const yR = reluChartY(reluExact(x))
      const yP = reluChartY(actPoly(x))
      return (
        `<line class="relu-mark-line" x1="${cx.toFixed(1)}" y1="${yR.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${yP.toFixed(1)}" />` +
        `<circle class="relu-mark relu-mark-poly" cx="${cx.toFixed(1)}" cy="${yP.toFixed(1)}" r="3.5" />` +
        `<circle class="relu-mark relu-mark-relu" cx="${cx.toFixed(1)}" cy="${yR.toFixed(1)}" r="3.5" />`
      )
    })
    .join('')
  e4ReluChart.innerHTML =
    `<svg viewBox="0 0 ${RELU_W} ${RELU_H}" width="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <line class="relu-axis" x1="${RELU_PAD}" y1="${axisY.toFixed(1)}" x2="${(RELU_W - RELU_PAD).toFixed(1)}" y2="${axisY.toFixed(1)}" />
      <line class="relu-axis" x1="${x0.toFixed(1)}" y1="${RELU_PAD}" x2="${x0.toFixed(1)}" y2="${(RELU_H - RELU_PAD).toFixed(1)}" />
      <polygon class="relu-gap" points="${gapPolygon()}" />
      <polyline class="relu-line relu-line-relu" points="${reluPath(reluExact)}" />
      <polyline class="relu-line relu-line-poly" points="${reluPath(actPoly)}" />
      ${markSvg}
    </svg>`
}
buildReluChart()

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
    buildReluChart() // clear per-input marks; they no longer reflect the sliders
  })
})

// Each input feature is encrypted into its OWN ciphertext (value in slot 0).
// This lets the weighted sum Σ W[j][i]·x_i be built purely by plaintext-weight ×
// ciphertext multiplies followed by ciphertext additions — no rotation keys and
// no decryption. The hidden pre-activations, the activation, and the output are
// all held as ciphertexts and only the final result is decrypted.
let e4InputCts: CkksCiphertext[] | null = null
let e4OutCt: CkksCiphertext | null = null
const e4Log = document.querySelector('[data-e4-log]') as HTMLElement

// Homomorphic linear combination: Σ weights[i]·ct_i, rescaled back to Δ, + bias.
function homLinComb(cts: CkksCiphertext[], weights: number[], bias: number, tag: string): CkksCiphertext {
  let acc = engine.multiplyPlain(cts[0], [weights[0]], `${tag}-w0`) // scale → Δ²
  for (let i = 1; i < weights.length; i += 1) {
    const term = engine.multiplyPlain(cts[i], [weights[i]], `${tag}-w${i}`)
    acc = engine.add(acc, term, `${tag}-acc`)
  }
  const rescaled = engine.rescale(acc, `${tag}-rescale`) // → Δ
  return engine.addPlain(rescaled, [bias], `${tag}-bias`)
}

// Homomorphic activation A0 + A1·h + A2·h² on a single-slot ciphertext.
function homActivation(h: CkksCiphertext, tag: string): CkksCiphertext {
  const h2 = engine.rescale(engine.multiply(h, h, `${tag}-h2`), `${tag}-h2r`)      // Δ, level−1
  const lin = engine.rescale(engine.multiplyPlain(h, [ACT.a1], `${tag}-l`), `${tag}-lr`)
  const quad = engine.rescale(engine.multiplyPlain(h2, [ACT.a2], `${tag}-q`), `${tag}-qr`)
  const linLow = engine.rescale(engine.multiplyPlain(lin, [1], `${tag}-id`), `${tag}-idr`) // match level
  const sum = engine.add(linLow, quad, `${tag}-sum`)
  return engine.addPlain(sum, [ACT.a0], `${tag}-a0`)
}

;(document.querySelector('[data-e4-plain]') as HTMLButtonElement).addEventListener('click', () => {
  const x = currentInput()
  const plain = forwardPlain(x)
  e4Log.textContent = `Plaintext inference (reference)\ninput=${formatVec(x)}\noutput=${plain.y.toFixed(6)}\nclass=${plain.cls}`
})

;(document.querySelector('[data-e4-enc]') as HTMLButtonElement).addEventListener('click', () => {
  const x = currentInput()
  e4InputCts = x.map((v, i) => engine.encryptVector([v], `nn-x${i}`))
  e4OutCt = null
  setNetStage('reset')
  setNetStage('encrypted')
  e4Log.textContent =
    `Encrypted ${x.length} input features (one ciphertext each).\n` +
    `First feature ciphertext:\n${engine.formatCiphertext(e4InputCts[0])}\n\n` +
    `The plaintext values never leave the client from here on.`
})

;(document.querySelector('[data-e4-run]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e4InputCts) {
    e4Log.textContent = 'Encrypt inputs first.'
    return
  }
  const start = performance.now()

  // Layer 1: two hidden neurons, each a homomorphic weighted sum + activation.
  const hLinear = W1.map((row, j) => homLinComb(e4InputCts as CkksCiphertext[], row, b1[j], `h${j}`))
  const hActivated = hLinear.map((h, j) => homActivation(h, `a${j}`))

  // Layer 2: output neuron — weighted sum of the (still-encrypted) activations.
  let out = engine.multiplyPlain(hActivated[0], [W2[0]], 'out-w0')
  for (let i = 1; i < hActivated.length; i += 1) {
    const term = engine.multiplyPlain(hActivated[i], [W2[i]], `out-w${i}`)
    out = engine.add(out, term, 'out-acc')
  }
  e4OutCt = engine.addPlain(out, [b2], 'out-bias')
  const elapsedMs = performance.now() - start

  // The hidden values shown in the diagram are DECRYPTED copies for teaching —
  // the computation itself ran on the ciphertexts above, not on these numbers.
  const hiddenPeek = hActivated.map((h) => engine.decryptVector(h, 1)[0])
  setNetStage('run', { hidden: hiddenPeek })

  // Mark each hidden neuron's pre-activation on the ReLU-vs-poly curve so the
  // learner sees exactly where THIS input lands and how big the ReLU↔poly gap is.
  const xIn = currentInput()
  const preActs = W1.map((row, j) => row.reduce((acc, w, i) => acc + w * xIn[i], b1[j]))
  buildReluChart(preActs)
  const capEl = document.querySelector('[data-e4-relu-caption]') as HTMLElement
  const gapText = preActs
    .map((z, j) => `h${j + 1} at x=${z.toFixed(2)} (gap ${(actPoly(z) - reluExact(z)).toFixed(3)})`)
    .join('; ')
  capEl.textContent = `Marked on the curve: ${gapText}. The larger the gap, the more the encrypted output can differ from a true-ReLU network.`

  e4Log.textContent =
    `Encrypted inference — every operation below ran on ciphertext:\n` +
    `  Layer 1: plaintext-weight × ciphertext, summed, rescaled, + bias\n` +
    `  Activation: A0 + A1·h + A2·h²  (one homomorphic multiply, then rescale)\n` +
    `  Layer 2: plaintext-weight × ciphertext, summed, + bias\n` +
    `Output ciphertext is at level ${(e4OutCt as CkksCiphertext).level}; only the\n` +
    `secret-key holder can decrypt it.\n` +
    `Toy in-browser wall-clock for this forward pass: ${elapsedMs.toFixed(2)} ms\n` +
    `(Illustrative only — production CKKS on real models runs orders of magnitude slower.)`
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
  e4Log.textContent +=
    `\n\nDecrypted output ≈ ${dec.toFixed(6)} (from the ciphertext, via c0 + c1·s)\n` +
    `Plaintext reference = ${plain.y.toFixed(6)}\n` +
    `Encrypted class=${cls}, plaintext class=${plain.cls} — they should match.`
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
  return void (e5Log.textContent += `\n${prefix}: ${out.toPrecision(14)} | true ${e5True.toPrecision(14)} | ~${digits} digits | depth left ${e5Ct.level}`)
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
  // Depth budget is a hard wall, not a soft fade. At level 0 there is no modulus
  // left to drop, so rescale is a no-op: the scale would stay at Δ² and the next
  // product would wrap around q and decode to a meaningless number. Printing that
  // number next to "precision is degrading" would be a lie — the value is not
  // imprecise, it is destroyed. Refuse the operation and say why.
  if (e5Ct.level === 0) {
    e5Log.textContent +=
      `\nDepth budget exhausted — the ciphertext is at level 0.\n` +
      `  This toy chain has ${engine.params.modChain.length} moduli, so it allows ` +
      `${engine.params.modChain.length - 1} multiply+rescale cycles and no more.\n` +
      `  Multiplying again would leave the scale at Δ² with no modulus to divide by; the product\n` +
      `  would wrap modulo q and decode to garbage, not to a slightly-less-precise answer.\n` +
      `  A real deployment bootstraps here. This demo stops instead of printing a fake result.\n` +
      `  Click "Reset π" to start over at level ${engine.params.modChain.length - 1}.`
    e5Log.scrollTop = e5Log.scrollHeight
    return
  }
  const mul = engine.encryptVector([1.1], `mul-${e5Op}`)
  e5Ct = engine.rescale(engine.multiply(e5Ct, mul, `e5-mul-${e5Op}`), `e5-rescale-${e5Op}`)
  e5True *= 1.1
  e5Op += 1
  reportE5('After multiply+rescale')
})
