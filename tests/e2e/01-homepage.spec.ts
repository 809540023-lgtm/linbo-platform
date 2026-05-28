import { test, expect } from '@playwright/test'

test.describe('首頁', () => {
  test('載入完成 + 主標題顯示', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /看見市場的另一面/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /立即報名/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /看活動示範/ })).toBeVisible()
  })

  test('彈跳框（IntroModal）首次造訪會出現，關掉後不再出現', async ({ page, context }) => {
    // modal 用 localStorage 'linbo_intro_v3_seen' 判斷，goto 前先清掉
    await context.addInitScript(() => {
      try { window.localStorage.removeItem('linbo_intro_v3_seen') } catch {}
    })
    await page.goto('/')
    await page.waitForTimeout(800) // intro-modal 有 400ms setTimeout

    const modal = page.locator('div.fixed.inset-0.z-50')
    await expect(modal).toBeVisible({ timeout: 3000 })

    // 點背景關掉
    await modal.click({ position: { x: 5, y: 5 }, force: true })
    await expect(modal).toBeHidden({ timeout: 2000 })

    // 重新整理後不應再出現（localStorage 已記）
    await page.reload()
    await page.waitForTimeout(800)
    await expect(modal).toBeHidden()
  })

  test('近期場次卡片可點進活動頁（未登入會被引導去登入）', async ({ page }) => {
    await page.goto('/')
    const firstEventLink = page.locator('a[href^="/events/"]').first()
    if (await firstEventLink.count() === 0) {
      test.skip(true, '首頁沒有近期場次')
    }
    await firstEventLink.click()
    // middleware 會把未登入者轉去 /auth/login?next=/events/...
    // 接受任一：直接停在 /events/[id] 或 redirect 去 /auth/login
    await expect(page).toHaveURL(/\/(events\/[0-9a-f-]{36}|auth\/login)/)
  })
})
