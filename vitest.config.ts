import { defineConfig } from 'vitest/config'

/**
 * Unit-test runner for the crypto core. The Playwright a11y suite lives in
 * e2e/ and is driven by `npm run test:a11y`; it must never be collected here,
 * so e2e/ is explicitly excluded.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**']
  }
})
