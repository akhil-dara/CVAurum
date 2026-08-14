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
  resolve: {
    alias: { '@': path.resolve(here, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
