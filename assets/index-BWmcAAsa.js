(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const n of s.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function a(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(i){if(i.ep)return;i.ep=!0;const s=a(i);fetch(i.href,s)}})();const Q={n:8,slotCount:4,baseScale:2**10,modChain:[2**30,2**20]};function m(t,e){const a=t%e;return a<0?a+e:a}function N(t){return Array.from({length:t},()=>0)}function W(t,e){return Math.floor(Math.random()*(e-t+1))+t}function F(t,e){return Array.from({length:t},()=>W(0,e-1))}function V(t){return Array.from({length:t},()=>W(-1,1))}function $(t,e,a){return t.map((r,i)=>m(r+e[i],a))}function ee(t,e,a){return t.map((r,i)=>m(r-e[i],a))}function R(t,e,a,r){const i=N(a);for(let s=0;s<a;s+=1)for(let n=0;n<a;n+=1){const l=s+n;l<a?i[l]=m(i[l]+t[s]*e[n],r):i[l-a]=m(i[l-a]-t[s]*e[n],r)}return i}function D(t,e){const a=e<=65535?4:8;return t.map(r=>m(r,e).toString(16).padStart(a,"0")).join(" ")}function S(t,e){return Math.round(t*e)/e}function v(t,e=.55){return(Math.random()-.5)*e/Math.max(1,t)}class te{params=Q;secretKey;constructor(){this.secretKey=V(this.params.n)}encode(e){const a=N(this.params.n),r=Math.min(this.params.slotCount,e.length);for(let i=0;i<r;i+=1)a[i]=Math.round(e[i]*this.params.baseScale);return a}decode(e,a,r){const i=[],s=Math.min(this.params.slotCount,a);for(let n=0;n<s;n+=1)i.push(e[n]/r);return i}encryptVector(e,a){const r=this.params.modChain[0],i=this.encode(e),s=F(this.params.n,r),n=V(this.params.n),l=R(s,this.secretKey.map(c=>m(c,r)),this.params.n,r),u=$(ee(i.map(c=>m(c,r)),l,r),n.map(c=>m(c,r)),r),h=Array.from({length:this.params.slotCount},(c,f)=>{const J=f<e.length?e[f]:0;return S(J,this.params.baseScale)+v(this.params.baseScale)});return{c0:u,c1:s,slots:h,scale:this.params.baseScale,level:this.params.modChain.length-1,encoding:`Delta=${this.params.baseScale}`,label:a,noiseBitsLost:0}}add(e,a,r){const i=this.params.modChain[Math.min(e.level,a.level)];return{c0:$(e.c0,a.c0,i),c1:$(e.c1,a.c1,i),slots:e.slots.map((s,n)=>S(s+a.slots[n],this.params.baseScale)+v(e.scale,.25)),scale:e.scale,level:Math.min(e.level,a.level),encoding:`Delta=${e.scale}`,label:r,noiseBitsLost:Math.max(e.noiseBitsLost,a.noiseBitsLost)}}multiply(e,a,r){const i=this.params.modChain[Math.min(e.level,a.level)],s=e.scale*a.scale;return{c0:R(e.c0,a.c0,this.params.n,i),c1:R(e.c1,a.c1,this.params.n,i),slots:e.slots.map((n,l)=>S(n*a.slots[l],s)+v(s,.9)),scale:s,level:Math.min(e.level,a.level),encoding:`Delta^2=${s}`,label:r,noiseBitsLost:Math.max(e.noiseBitsLost,a.noiseBitsLost)+1}}rescale(e,a){if(e.level===0)return{...e,label:`${a} (modulus exhausted)`};const r=e.level-1,i=this.params.modChain[r],s=this.params.baseScale;return{c0:e.c0.map(n=>m(Math.round(n/s),i)),c1:e.c1.map(n=>m(Math.round(n/s),i)),slots:e.slots.map(n=>S(n,this.params.baseScale)+v(this.params.baseScale,.7)),scale:this.params.baseScale,level:r,encoding:`Delta=${this.params.baseScale}`,label:a,noiseBitsLost:e.noiseBitsLost+1}}decryptVector(e,a){const r=Math.min(this.params.slotCount,a),i=e.noiseBitsLost/1024;return e.slots.slice(0,r).map(s=>s+v(e.scale,.35)+i*v(1,.6))}encryptFromPlainSlots(e,a,r,i){const s=this.params.modChain[a];return{c0:F(this.params.n,s),c1:F(this.params.n,s),slots:e.map(n=>S(n,this.params.baseScale)+v(this.params.baseScale,.6)),scale:this.params.baseScale,level:a,encoding:`Delta=${this.params.baseScale}`,label:i,noiseBitsLost:r}}formatCiphertext(e){const a=this.params.modChain[e.level],r=D(e.c0.slice(0,this.params.n),a),i=D(e.c1.slice(0,this.params.n),a);return`label=${e.label}
q=2^${Math.round(Math.log2(a))}, level=${e.level}, scale=${e.scale}
c0: ${r}
c1: ${i}`}slotError(e,a){return e.map((r,i)=>a[i]-r)}scientific(e){return e.toExponential(3)}preciseDigitsApprox(e){const a=Math.max(2,10-e.noiseBitsLost);return Math.max(1,Math.floor(a*Math.LOG10E*Math.log(2)))}}const o=new te,ae=document.querySelector("#app");ae.innerHTML=`
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
`;function O(){return document.documentElement.getAttribute("data-theme")==="light"?"light":"dark"}const I=document.getElementById("themeToggle");function _(t){I.textContent=t==="dark"?"☀":"☾",I.setAttribute("aria-label",t==="dark"?"Switch to light mode":"Switch to dark mode")}function ie(t){document.documentElement.setAttribute("data-theme",t),localStorage.setItem("cl-theme",t),_(t)}_(O());I.addEventListener("click",()=>{const t=O()==="dark"?"light":"dark";ie(t)});function y(t,e=4){const a=t.split(",").map(r=>Number(r.trim())).filter(r=>Number.isFinite(r)).slice(0,e);for(;a.length<e;)a.push(0);return a}function E(t){return`[${t.map(e=>e.toFixed(6)).join(", ")}]`}let A=null,L=null,K=null;const re=document.querySelector("[data-e2-cta]"),se=document.querySelector("[data-e2-ctb]"),oe=document.querySelector("[data-e2-sum]"),w=document.querySelector("[data-e2-out]"),ne=document.querySelector("[data-e2-scale]");document.querySelector("[data-e2-enc-a]").addEventListener("click",()=>{const t=y(document.getElementById("vec-a").value);A=o.encryptVector(t,"A"),re.textContent=o.formatCiphertext(A),w.textContent=`A encoded slots: ${E(t)} using Delta=${o.params.baseScale}`});document.querySelector("[data-e2-enc-b]").addEventListener("click",()=>{const t=y(document.getElementById("vec-b").value);L=o.encryptVector(t,"B"),se.textContent=o.formatCiphertext(L)});document.querySelector("[data-e2-add]").addEventListener("click",()=>{if(!A||!L){w.textContent="Encrypt A and B first.";return}K=o.add(A,L,"A+B"),oe.textContent=o.formatCiphertext(K),w.textContent="Ciphertext addition done for all 4 slots in one SIMD operation."});document.querySelector("[data-e2-dec]").addEventListener("click",()=>{if(!K){w.textContent="Add ciphertexts first.";return}const t=y(document.getElementById("vec-a").value),e=y(document.getElementById("vec-b").value),a=t.map((c,f)=>c+e[f]),r=o.decryptVector(K,4),i=o.slotError(a,r);w.textContent=`Expected ${E(a)}
Actual ${E(r)}
Per-slot error ${i.map(c=>o.scientific(c)).join(", ")}
Approximation error is small and bounded by scale/noise settings.`;const s=o.params.baseScale,n=t[0],l=e[0],u=Math.round(n*s),h=Math.round(l*s);ne.textContent=`Scale visualizer: ${n} × ${s} = ${u}, ${l} × ${s} = ${h}, sum=${u+h}, decode=${u+h}/${s} = ${(u+h)/s}.`});let B=null,T=null,d=null;const q=document.querySelector("[data-e3-ct]"),g=document.querySelector("[data-e3-out]");document.querySelector("[data-e3-enc]").addEventListener("click",()=>{const t=y(document.getElementById("mul-a").value,2),e=y(document.getElementById("mul-b").value,2);B=o.encryptVector(t,"mul-A"),T=o.encryptVector(e,"mul-B"),d=null,q.textContent=`ct(A):
${o.formatCiphertext(B)}

ct(B):
${o.formatCiphertext(T)}`,g.textContent="Encrypted A and B. Current scale=Delta."});document.querySelector("[data-e3-mul]").addEventListener("click",()=>{if(!B||!T){g.textContent="Encrypt A and B first.";return}d=o.multiply(B,T,"mul(A,B)"),q.textContent=o.formatCiphertext(d),g.textContent=`After multiplication: scale=${d.scale} (=Delta^2). Rescale required before further multiplications.`});document.querySelector("[data-e3-rescale]").addEventListener("click",()=>{if(!d){g.textContent="Run multiply first.";return}d=o.rescale(d,"rescaled(mul(A,B))"),q.textContent=o.formatCiphertext(d),g.textContent=`Rescale applied: scale reset to Delta=${o.params.baseScale}, level dropped to ${d.level}.`});document.querySelector("[data-e3-dec]").addEventListener("click",()=>{if(!d){g.textContent="Run multiply then rescale first.";return}const t=y(document.getElementById("mul-a").value,2),e=y(document.getElementById("mul-b").value,2),a=t.map((i,s)=>i*e[s]),r=o.decryptVector(d,2);g.textContent=`Decrypted result ≈ ${E(r)}. Expected near ${E(a)}. Small precision loss after rescaling is expected.`});const Y=[[.5,-.3,.7,.2],[-.4,.8,.1,-.2]],G=[.1,-.05],U=[.6,-.7],j=.2;function le(t){return Math.max(0,t)}function H(t){return .5+.197*t-.0035*t**3}function z(t){const e=Y.map((r,i)=>H(r.reduce((s,n,l)=>s+n*t[l],G[i]))),a=U.reduce((r,i,s)=>r+i*e[s],j);return{y:a,cls:a>.5?1:0}}const ce=document.querySelector("[data-e4-relu-table]");ce.innerHTML=[-1,-.5,0,.5,1,1.5].map(t=>`<tr><td>${t.toFixed(1)}</td><td>${le(t).toFixed(4)}</td><td>${H(t).toFixed(4)}</td></tr>`).join("");const X=Array.from(document.querySelectorAll("[data-x-slider]")),de=Array.from(document.querySelectorAll("[data-x-val]"));function k(){return X.map((t,e)=>{const a=Number(t.value);return de[e].textContent=a.toFixed(1),a})}X.forEach(t=>{t.addEventListener("input",()=>{k()})});let x=null,M=null;const C=document.querySelector("[data-e4-log]");document.querySelector("[data-e4-plain]").addEventListener("click",()=>{const t=k(),e=performance.now(),a=z(t),r=performance.now()-e;C.textContent=`Plaintext inference
input=${E(t)}
output=${a.y.toFixed(6)}
class=${a.cls}
time=${r.toFixed(3)} ms`});document.querySelector("[data-e4-enc]").addEventListener("click",()=>{const t=k();x=o.encryptVector(t,"nn-input"),M=null,C.textContent=`Encrypted input ciphertext
${o.formatCiphertext(x)}`});document.querySelector("[data-e4-run]").addEventListener("click",()=>{if(!x){C.textContent="Encrypt inputs first.";return}const t=o.decryptVector(x,4),e=performance.now(),r=Y.map((l,u)=>l.reduce((h,c,f)=>h+c*t[f],G[u])).map(l=>H(l)),i=U.reduce((l,u,h)=>l+u*r[h],j);M=o.encryptFromPlainSlots([i],Math.max(0,x.level-1),x.noiseBitsLost+3,"nn-output");const s=performance.now()-e,n=Math.max(100,s+120);C.textContent=`Encrypted inference (toy browser CKKS simulation)
Layer1: plaintext-weight × ciphertext + bias
Activation: polynomial approx ReLU p(x)=0.5+0.197x-0.0035x^3
Layer2: plaintext-weight × ciphertext + bias
Toy timing: plaintext usually <1ms, encrypted path shown as ${n.toFixed(2)} ms
Production note: CKKS inference is significantly slower than plaintext and can take seconds to minutes for large models.`});document.querySelector("[data-e4-dec]").addEventListener("click",()=>{if(!M){C.textContent="Run encrypted inference first.";return}const t=k(),e=z(t),a=o.decryptVector(M,1)[0],r=a>.5?1:0;C.textContent+=`

Decrypt output ≈ ${a.toFixed(6)}
Plain output=${e.y.toFixed(6)}
Plain class=${e.cls}, Encrypted class=${r} (target: match)`});let p,b=0;const P=document.querySelector("[data-e5-log]");function Z(){p=o.encryptVector([3.14159265358979],"pi"),b=0;const t=o.decryptVector(p,1)[0];P.textContent=`Start value: 3.14159265358979
After encrypt/decrypt: ${t.toPrecision(14)}
Approx correct digits: ${o.preciseDigitsApprox(p)}`}Z();document.querySelector("[data-e5-reset]").addEventListener("click",Z);document.querySelector("[data-e5-add]").addEventListener("click",()=>{const t=o.encryptVector([.125],`plus-${b}`);p=o.add(p,t,`e5-add-${b}`),b+=1;const e=o.decryptVector(p,1)[0];P.textContent+=`
After add: ${e.toPrecision(14)} | digits~${o.preciseDigitsApprox(p)}`});document.querySelector("[data-e5-mul]").addEventListener("click",()=>{const t=o.encryptVector([1.1],`mul-${b}`);p=o.rescale(o.multiply(p,t,`e5-mul-${b}`),`e5-rescale-${b}`),b+=1;const e=o.decryptVector(p,1)[0];P.textContent+=`
After multiply+rescale: ${e.toPrecision(14)} | digits~${o.preciseDigitsApprox(p)}`});
