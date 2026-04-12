import './style.css'
import { ToyCkksEngine } from './toyCkks'
import type { CkksCiphertext, Theme } from './types'

const engine = new ToyCkksEngine()
const app = document.querySelector('#app') as HTMLDivElement

app.innerHTML = `
  <div class="app">
    <header class="app-header" role="banner">
      <button class="theme-toggle" data-theme-toggle aria-label="Switch to light mode">🌙</button>
      <h1>CKKS Lab: Approximate FHE for Real-Valued ML</h1>
      <p class="subtitle">
        Educational CKKS over toy parameters (n=8, slots=4, scale=2^10, modulus chain [2^30, 2^20]).
        <strong>Educational CKKS — toy parameters. Production CKKS uses n &ge; 8192.</strong>
      </p>
    </header>

    <main class="exhibits" id="main-content" aria-label="Six CKKS exhibits">
      <section class="exhibit" id="exhibit-1" aria-labelledby="e1-heading" tabindex="-1">
        <h2 id="e1-heading">Exhibit 1: What CKKS Is and Why Approximation Is the Right Choice</h2>
        <p>
          CKKS (Cheon-Kim-Kim-Song, ASIACRYPT 2017) encrypts vectors of real/complex values and supports homomorphic
          addition/multiplication with approximate outputs: Decrypt(Enc(x) + Enc(y)) ≈ x + y.
          The approximation is bounded and deliberate.
        </p>
        <div class="grid-2">
          <div>
            <h3>The Core Idea</h3>
            <ul>
              <li>Vector ciphertexts support SIMD real-number arithmetic.</li>
              <li>Approximation is expected, controlled, and workload-aligned.</li>
              <li>ML already uses floating-point approximations (weights and activations).</li>
            </ul>
            <h3>Scale Parameter</h3>
            <p>Encode 3.14 at Δ=2^40: 3.14×2^40 ≈ 3,452,812,080,537.6 then rounded to integers.</p>
            <p>Multiplication grows scale to Δ²; rescaling reduces it back toward Δ.</p>
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
                  <tr><td>CKKS</td><td>Real vectors</td><td>Approximate</td><td>ML inference, statistics</td></tr>
                </tbody>
              </table>
            </div>
            <p>RLWE foundation: ciphertexts are polynomial pairs (c0, c1) in Z_q[x]/(x^n + 1).</p>
          </div>
        </div>
        <div class="callout" role="note">
          <strong>Why this matters:</strong> CKKS is the practical FHE path for encrypted ML inference.
          CryptoNets (Microsoft, 2016), Microsoft SEAL, OpenFHE, and HEAAN all rely on this design.
        </div>
        <p>
          For bit-level FHE (TFHE):
          <a href="https://systemslibrarian.github.io/crypto-lab-blind-oracle/" target="_blank" rel="noreferrer">https://systemslibrarian.github.io/crypto-lab-blind-oracle/</a>
        </p>
        <p>
          For exact integer FHE (BGV/BFV):
          <a href="https://systemslibrarian.github.io/crypto-lab-fhe-arena/" target="_blank" rel="noreferrer">https://systemslibrarian.github.io/crypto-lab-fhe-arena/</a>
        </p>
      </section>

      <section class="exhibit" id="exhibit-2" aria-labelledby="e2-heading" tabindex="-1">
        <h2 id="e2-heading">Exhibit 2: Encode, Encrypt, Add, Decrypt</h2>
        <p class="note">Educational CKKS — toy parameters. Production uses n &ge; 8192.</p>
        <p class="note">Implementation note: node-seal CKKS was assessed, and this lab uses the educational toy CKKS path so scale/modulus behavior is fully inspectable in-browser.</p>
        <p>
          Slot concept: with degree n, CKKS packs n/2 values. Here n=8, so 4 slots per ciphertext.
          In production, n=8192 packs 4096 values in one ciphertext operation.
        </p>
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
        <div class="row" role="toolbar" aria-label="Exhibit 2 controls">
          <button class="action" data-e2-enc-a>Encrypt A</button>
          <button class="action" data-e2-enc-b>Encrypt B</button>
          <button class="action" data-e2-add>Add ciphertexts</button>
          <button class="action action-orange" data-e2-dec>Decrypt result</button>
        </div>
        <div class="grid-2">
          <div>
            <h3>ct(A)</h3>
            <pre class="mono" data-e2-cta>awaiting...</pre>
          </div>
          <div>
            <h3>ct(B)</h3>
            <pre class="mono" data-e2-ctb>awaiting...</pre>
          </div>
        </div>
        <h3>ct(A + B)</h3>
        <pre class="mono" data-e2-sum>awaiting...</pre>
        <p data-e2-out aria-live="polite" role="status">Expected: [2.0, 4.0, 6.0, 4.9]</p>
        <div class="callout" role="note" data-e2-scale>
          Scale visualizer: 1.5 × 1024 = 1536, 0.5 × 1024 = 512, sum=2048, decode=2048/1024=2.0.
        </div>
      </section>

      <section class="exhibit" id="exhibit-3" aria-labelledby="e3-heading" tabindex="-1">
        <h2 id="e3-heading">Exhibit 3: Homomorphic Multiplication and Rescaling</h2>
        <p>
          Multiplication grows scale from Δ to Δ². Rescaling divides by Δ and drops one modulus level.
          Each multiplication depth step consumes one level.
        </p>
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
        <div class="row" role="toolbar" aria-label="Exhibit 3 controls">
          <button class="action" data-e3-enc>Encrypt A and B</button>
          <button class="action" data-e3-mul>Multiply ciphertexts</button>
          <button class="action action-orange" data-e3-rescale>Rescale</button>
          <button class="action" data-e3-dec>Decrypt</button>
        </div>
        <pre class="mono" data-e3-ct>awaiting...</pre>
        <p data-e3-out aria-live="polite">Result: awaiting operation</p>
        <div class="table-wrap">
          <table aria-label="CKKS multiplication depth table">
            <thead>
              <tr><th scope="col">Multiplications</th><th scope="col">Scale</th><th scope="col">Levels consumed</th><th scope="col">Status</th></tr>
            </thead>
            <tbody>
              <tr><td>0</td><td>Δ</td><td>0</td><td>Fresh</td></tr>
              <tr><td>1</td><td>Δ (after rescale)</td><td>1</td><td>Level 1</td></tr>
              <tr><td>2</td><td>Δ (after rescale)</td><td>2</td><td>Level 2</td></tr>
              <tr><td>L</td><td>Δ</td><td>L</td><td>Last level</td></tr>
              <tr><td>L+1</td><td>—</td><td>Exhausted</td><td>Bootstrapping needed</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="exhibit" id="exhibit-4" aria-labelledby="e4-heading" tabindex="-1">
        <h2 id="e4-heading">Exhibit 4: Encrypted Neural Network Inference</h2>
        <p>
          Two-layer toy classifier: 4 inputs → 2 hidden neurons → 1 output.
          ReLU is replaced by a degree-3 polynomial approximation: 0.5 + 0.197x - 0.0035x³.
        </p>
        <div class="slider-grid">
          <div>
            <label for="x1">x1 (-1 to 1)</label>
            <input id="x1" data-x-slider type="range" min="-1" max="1" step="0.1" value="0.3" />
            <div class="slider-val" data-x-val="0">0.3</div>
          </div>
          <div>
            <label for="x2">x2 (-1 to 1)</label>
            <input id="x2" data-x-slider type="range" min="-1" max="1" step="0.1" value="-0.1" />
            <div class="slider-val" data-x-val="1">-0.1</div>
          </div>
          <div>
            <label for="x3">x3 (-1 to 1)</label>
            <input id="x3" data-x-slider type="range" min="-1" max="1" step="0.1" value="0.6" />
            <div class="slider-val" data-x-val="2">0.6</div>
          </div>
          <div>
            <label for="x4">x4 (-1 to 1)</label>
            <input id="x4" data-x-slider type="range" min="-1" max="1" step="0.1" value="0.2" />
            <div class="slider-val" data-x-val="3">0.2</div>
          </div>
        </div>
        <div class="row" role="toolbar" aria-label="Exhibit 4 controls">
          <button class="action" data-e4-plain>Run plaintext inference</button>
          <button class="action" data-e4-enc>Encrypt inputs</button>
          <button class="action" data-e4-run>Run encrypted inference</button>
          <button class="action action-orange" data-e4-dec>Decrypt result</button>
        </div>
        <pre class="mono" data-e4-log>awaiting...</pre>
        <div class="table-wrap">
          <table aria-label="ReLU vs polynomial approximation">
            <thead><tr><th scope="col">x</th><th scope="col">ReLU(x)</th><th scope="col">Poly approx</th></tr></thead>
            <tbody data-e4-relu-table></tbody>
          </table>
        </div>
      </section>

      <section class="exhibit" id="exhibit-5" aria-labelledby="e5-heading" tabindex="-1">
        <h2 id="e5-heading">Exhibit 5: Precision, Scale, and Error Accumulation</h2>
        <p>
          Encoding error is ~1/Δ, RLWE noise is noise/Δ, and each rescaling loses additional precision bits.
        </p>
        <div class="row" role="toolbar" aria-label="Exhibit 5 controls">
          <button class="action" data-e5-reset>Reset tracker</button>
          <button class="action" data-e5-add>Add ciphertext</button>
          <button class="action" data-e5-mul>Multiply + rescale</button>
        </div>
        <pre class="mono" data-e5-log>awaiting...</pre>
        <div class="callout" role="note">
          Larger Δ means more precision but also larger modulus/ciphertexts. Production CKKS typically chooses Δ in [2^40, 2^60].
        </div>
      </section>

      <section class="exhibit" id="exhibit-6" aria-labelledby="e6-heading" tabindex="-1">
        <h2 id="e6-heading">Exhibit 6: The FHE Trilogy Complete</h2>
        <div class="table-wrap">
          <table aria-label="TFHE BGV BFV CKKS comparison">
            <thead>
              <tr><th scope="col">Property</th><th scope="col">TFHE (Blind Oracle)</th><th scope="col">BGV/BFV (FHE Arena)</th><th scope="col">CKKS (This demo)</th></tr>
            </thead>
            <tbody>
              <tr><td>Data type</td><td>Single bits</td><td>Integers mod t</td><td>Real vectors</td></tr>
              <tr><td>Result type</td><td>Exact</td><td>Exact</td><td>Approximate</td></tr>
              <tr><td>Operations</td><td>Any boolean gate</td><td>Add, multiply</td><td>Add, multiply (approx)</td></tr>
              <tr><td>Best for</td><td>Arbitrary functions</td><td>Integer statistics</td><td>ML inference</td></tr>
              <tr><td>Batching</td><td>No</td><td>Yes (CRT)</td><td>Yes (n/2 slots)</td></tr>
              <tr><td>Multiplication depth</td><td>Unlimited with bootstrap</td><td>~10-20 levels</td><td>~4-16 levels</td></tr>
              <tr><td>Speed (addition)</td><td>Slow per bit</td><td>Fast</td><td>Fast</td></tr>
              <tr><td>Speed (mult.)</td><td>Fast per gate</td><td>Moderate</td><td>Moderate</td></tr>
              <tr><td>Library</td><td>TFHE-rs, Concrete</td><td>SEAL, HElib, OpenFHE</td><td>SEAL (CKKS), HEAAN, OpenFHE</td></tr>
              <tr><td>In crypto-lab</td><td>Blind Oracle</td><td>FHE Arena</td><td>This demo</td></tr>
            </tbody>
          </table>
        </div>
        <div class="callout" role="note">
          <strong>Decision tree:</strong> boolean logic → TFHE, exact integer arithmetic → BGV/BFV,
          encrypted neural network inference and real-valued statistics → CKKS.
        </div>
        <p>
          Bootstrapping landscape: TFHE ~10ms class, BGV/BFV seconds class, CKKS often ~100ms-1s class depending on parameters/hardware.
        </p>
        <nav aria-label="Cross-demo links">
          <ul class="link-list">
            <li><a href="https://systemslibrarian.github.io/crypto-lab-blind-oracle/" target="_blank" rel="noreferrer">Blind Oracle (TFHE)</a></li>
            <li><a href="https://systemslibrarian.github.io/crypto-lab-fhe-arena/" target="_blank" rel="noreferrer">FHE Arena (BGV/BFV)</a></li>
            <li><a href="https://systemslibrarian.github.io/crypto-compare/" target="_blank" rel="noreferrer">Crypto Compare</a></li>
          </ul>
        </nav>
      </section>
    </main>
  </div>
`

function getCurrentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

const themeToggleBtn = document.querySelector('[data-theme-toggle]') as HTMLButtonElement

function syncThemeToggle(theme: Theme): void {
  themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️'
  themeToggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
}

function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
  syncThemeToggle(theme)
}

syncThemeToggle(getCurrentTheme())
themeToggleBtn.addEventListener('click', () => {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
})

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
  e2Scale.textContent = `Scale visualizer: 1.5 × ${s} = ${1.5 * s}, 0.5 × ${s} = ${0.5 * s}, sum=${2 * s}, decode=${(2 * s) / s}.`
})

let e3A: CkksCiphertext | null = null
let e3B: CkksCiphertext | null = null
let e3Mul: CkksCiphertext | null = null
const e3Ct = document.querySelector('[data-e3-ct]') as HTMLElement
const e3Out = document.querySelector('[data-e3-out]') as HTMLElement

;(document.querySelector('[data-e3-enc]') as HTMLButtonElement).addEventListener('click', () => {
  const a = parseVector((document.getElementById('mul-a') as HTMLInputElement).value, 2)
  const b = parseVector((document.getElementById('mul-b') as HTMLInputElement).value, 2)
  e3A = engine.encryptVector(a, 'mul-A')
  e3B = engine.encryptVector(b, 'mul-B')
  e3Mul = null
  e3Ct.textContent = `ct(A):\n${engine.formatCiphertext(e3A)}\n\nct(B):\n${engine.formatCiphertext(e3B)}`
  e3Out.textContent = 'Encrypted A and B. Current scale=Delta.'
})

;(document.querySelector('[data-e3-mul]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e3A || !e3B) {
    e3Out.textContent = 'Encrypt A and B first.'
    return
  }
  e3Mul = engine.multiply(e3A, e3B, 'mul(A,B)')
  e3Ct.textContent = engine.formatCiphertext(e3Mul)
  e3Out.textContent = `After multiplication: scale=${e3Mul.scale} (=Delta^2). Rescale required before further multiplications.`
})

;(document.querySelector('[data-e3-rescale]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e3Mul) {
    e3Out.textContent = 'Run multiply first.'
    return
  }
  e3Mul = engine.rescale(e3Mul, 'rescaled(mul(A,B))')
  e3Ct.textContent = engine.formatCiphertext(e3Mul)
  e3Out.textContent = `Rescale applied: scale reset to Delta=${engine.params.baseScale}, level dropped to ${e3Mul.level}.`
})

;(document.querySelector('[data-e3-dec]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e3Mul) {
    e3Out.textContent = 'Run multiply then rescale first.'
    return
  }
  const out = engine.decryptVector(e3Mul, 2)
  e3Out.textContent = `Decrypted result ≈ ${formatVec(out)}. Expected near [3.0, 8.1]. Small precision loss after rescaling is expected.`
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
  e4Log.textContent += `\n\nDecrypt output ≈ ${dec.toFixed(6)}\nPlain output=${plain.y.toFixed(6)}\nPlain class=${plain.cls}, Encrypted class=${cls} (target: match)`
})

let e5Ct: CkksCiphertext
let e5Op = 0
const e5Log = document.querySelector('[data-e5-log]') as HTMLElement

function resetE5(): void {
  e5Ct = engine.encryptVector([3.14159265358979], 'pi')
  e5Op = 0
  const out = engine.decryptVector(e5Ct, 1)[0]
  e5Log.textContent = `Start value: 3.14159265358979\nAfter encrypt/decrypt: ${out.toPrecision(14)}\nApprox correct digits: ${engine.preciseDigitsApprox(e5Ct)}`
}

resetE5()

;(document.querySelector('[data-e5-reset]') as HTMLButtonElement).addEventListener('click', resetE5)

;(document.querySelector('[data-e5-add]') as HTMLButtonElement).addEventListener('click', () => {
  const plus = engine.encryptVector([0.125], `plus-${e5Op}`)
  e5Ct = engine.add(e5Ct, plus, `e5-add-${e5Op}`)
  e5Op += 1
  const out = engine.decryptVector(e5Ct, 1)[0]
  e5Log.textContent += `\nAfter add: ${out.toPrecision(14)} | digits~${engine.preciseDigitsApprox(e5Ct)}`
})

;(document.querySelector('[data-e5-mul]') as HTMLButtonElement).addEventListener('click', () => {
  const mul = engine.encryptVector([1.1], `mul-${e5Op}`)
  e5Ct = engine.rescale(engine.multiply(e5Ct, mul, `e5-mul-${e5Op}`), `e5-rescale-${e5Op}`)
  e5Op += 1
  const out = engine.decryptVector(e5Ct, 1)[0]
  e5Log.textContent += `\nAfter multiply+rescale: ${out.toPrecision(14)} | digits~${engine.preciseDigitsApprox(e5Ct)}`
})
