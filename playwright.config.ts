import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end configuration.
 *
 * The dev server is started without VITE_GOOGLE_FONTS_API_KEY, so these tests
 * run against the bundled 35-family fallback — the path anyone cloning this
 * repo will hit. Any font a test names must therefore exist in that list.
 *
 * The app pins its port with `strictPort`, because the Google Fonts key is
 * referrer-restricted. `reuseExistingServer` is off in CI so a stale server
 * cannot mask a broken build.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
