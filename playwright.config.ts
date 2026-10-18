import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  // Production event sections stream after bounded Core reads (8s each),
  // while registration has a 12s transport timeout. The default 5s assertion
  // window can expire before either boundary has settled on a busy CI runner.
  expect: { timeout: 20000 },
  use: {
    baseURL: 'http://127.0.0.1:4300',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'node scripts/e2e-servers.mjs',
    url: 'http://127.0.0.1:4300/events',
    reuseExistingServer: false,
    timeout: 180000,
  },
})
