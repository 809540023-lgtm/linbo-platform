import { test, expect } from '@playwright/test'

const PILOT_EVENT_ID = 'cf254d27-2e70-42bb-803a-552ae1dec9b8'

// 需要登入後才能用——尚未設 E2E_TEST_USER_EMAIL/PASSWORD 時自動 skip
const hasTestUser = !!process.env.E2E_TEST_USER_EMAIL && !!process.env.E2E_TEST_USER_PASSWORD

test.describe('報名表單', () => {
  test.skip(!hasTestUser, '需要設 E2E_TEST_USER_EMAIL + E2E_TEST_USER_PASSWORD（Supabase Email/Password 測試帳號）')

  test('登入後填寫表單可送出，redirect 回活動頁帶 success=1', async ({ page }) => {
    // 走 magic link / phone OTP 在 e2e 不好做；簡單作法是請使用者自己準備
    // 一個 Email/Password 測試帳號（在 Supabase Dashboard 開）
    await page.goto('/auth/login')
    // TODO: 視 login UI 實際支援 email/password 與否，這支測試可能需要手動補完
    test.skip(true, 'login UI 目前只支援 Google OAuth + Phone OTP — 待補 E2E 友善的測試帳號流程')

    await page.goto(`/events/${PILOT_EVENT_ID}`)
    const registerTab = page.getByRole('button', { name: /報名/ }).first()
    await registerTab.click()

    await page.getByLabel(/推薦人姓名|推薦人/).fill('e2e 測試')
    await page.getByLabel(/LINE/i).fill('e2e_test')
    await page.getByRole('button', { name: /送出|報名/ }).first().click()

    await expect(page).toHaveURL(/success=1/)
  })
})
