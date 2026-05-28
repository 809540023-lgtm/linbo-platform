import { test, expect } from '@playwright/test'

// Pilot 場 event id（指南提供）
const PILOT_EVENT_ID = 'cf254d27-2e70-42bb-803a-552ae1dec9b8'

test.describe('活動頁 — 分頁切換', () => {
  test('未報名訪客看到 5 個 tab，逐一切換內容更新', async ({ page }) => {
    await page.goto(`/events/${PILOT_EVENT_ID}`)

    // 介紹頁應該有事件標題
    await expect(page.getByRole('heading', { name: /林博/ }).first()).toBeVisible()

    const tabs = ['介紹', '票價', '咖啡', '甜點', '報名']
    for (const label of tabs) {
      // tab nav 是 button 含 emoji + label
      const btn = page.getByRole('button', { name: new RegExp(label) }).first()
      await btn.click()
      await page.waitForTimeout(150)
    }
    // 最後停在「報名」tab
    await expect(page.getByText(/票種|現場票|線上票/).first()).toBeVisible()
  })

  test('未開播時直播 tab 不該出現（未報名訪客）', async ({ page }) => {
    await page.goto(`/events/${PILOT_EVENT_ID}`)
    // 未報名 → 不會看到直播 tab
    const liveTab = page.getByRole('button', { name: /直播/ })
    await expect(liveTab).toHaveCount(0)
  })
})
