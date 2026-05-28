import { defineConfig, devices } from '@playwright/test'

// 預設打 production；本地可以 BASE_URL=http://localhost:3000 npx playwright test
const baseURL = process.env.E2E_BASE_URL || 'https://linbo.0915888927.com'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
})
