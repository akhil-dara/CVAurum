import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/**
 * Unit tests run against plain modules — deliberately NOT through the app's
 * vite.config.ts, whose PWA plugin expects a real build context and throws
 * under the test runner.
 */
export default defineConfig({
  // `.icc` is not one of Vite's built-in asset types: the build-time
  // `?inline` import of the sRGB profile in `src/lib/pdf/pdfa.ts` needs this
  // to be treated as an asset (inlined as a data: URI string) instead of
  // parsed as JavaScript. Mirrors `assetsInclude` in vite.config.ts, which
  // the test runner deliberately does not load (see above).
  assetsInclude: ['**/*.icc'],
  resolve: {
    alias: { '@': path.resolve(here, './src') },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
  },
})
