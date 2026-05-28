import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'node',
    alias: { electron: new URL('./tests/__mocks__/electron.js', import.meta.url).pathname }
  }
})
