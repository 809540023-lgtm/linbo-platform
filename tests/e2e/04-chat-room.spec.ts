import { test, expect } from '@playwright/test'

const hasTestUser = !!process.env.E2E_TEST_USER_EMAIL && !!process.env.E2E_TEST_USER_PASSWORD

test.describe('聊天室', () => {
  test('/chat 未登入會重導去 /auth/login', async ({ page }) => {
    await page.goto('/chat')
    // middleware 會 redirect
    await expect(page).toHaveURL(/auth\/login/, { timeout: 8000 })
  })

  test.skip(!hasTestUser, '需要登入測試帳號')

  test('登入後可發訊息', async ({ page }) => {
    test.skip(true, 'login UI 目前只支援 Google OAuth + Phone OTP — 待補 E2E 友善的測試帳號流程')

    await page.goto('/chat')
    await page.getByPlaceholder(/輸入訊息|打字|觀察/).fill(`e2e ${Date.now()}`)
    await page.getByRole('button', { name: /送出|發送/ }).click()
    // 預期訊息會出現在列表
    await expect(page.getByText(/e2e/).last()).toBeVisible({ timeout: 4000 })
  })
})
