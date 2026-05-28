import { test, expect } from '@playwright/test'

// Pilot 場 event id（指南提供）
const PILOT_EVENT_ID = 'cf254d27-2e70-42bb-803a-552ae1dec9b8'
const hasTestUser = !!process.env.E2E_TEST_USER_EMAIL && !!process.env.E2E_TEST_USER_PASSWORD

test.describe('活動頁 — middleware', () => {
  test('未登入訪問活動頁會被重導去登入', async ({ page }) => {
    await page.goto(`/events/${PILOT_EVENT_ID}`)
    await expect(page).toHaveURL(/auth\/login/, { timeout: 8000 })
  })
})

test.describe('活動頁 — 分頁切換（需登入）', () => {
  test.skip(!hasTestUser, '需要 E2E_TEST_USER_EMAIL + E2E_TEST_USER_PASSWORD')

  test('未報名訪客看到 5 個 tab，逐一切換內容更新', async ({ page }) => {
    test.skip(true, 'login UI 目前只支援 Google OAuth + Phone OTP — 待補 e2e 友善流程')

    await page.goto(`/events/${PILOT_EVENT_ID}`)
    await expect(page.getByRole('heading', { name: /林博/ }).first()).toBeVisible()

    const tabs = ['介紹', '票價', '咖啡', '甜點', '報名']
    for (const label of tabs) {
      const btn = page.getByRole('button', { name: new RegExp(label) }).first()
      await btn.click()
      await page.waitForTimeout(150)
    }
    await expect(page.getByText(/票種|現場票|線上票/).first()).toBeVisible()
  })
})
