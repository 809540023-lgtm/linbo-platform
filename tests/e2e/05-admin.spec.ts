import { test, expect } from '@playwright/test'

test.describe('後台', () => {
  test('/admin 未登入會被擋下（302 / 重導）', async ({ page }) => {
    const resp = await page.goto('/admin')
    // middleware 應該 redirect 未登入者
    // 接受 302 或最終落在 /auth/login
    const finalUrl = page.url()
    const ok = finalUrl.includes('/auth/login') || (resp && resp.status() >= 300 && resp.status() < 400)
    expect(ok).toBeTruthy()
  })

  test('未登入直接打 /api/agent-a 應 401', async ({ request }) => {
    const resp = await request.get('/api/agent-a')
    expect(resp.status()).toBe(401)
  })

  test('未登入直接打 /api/send-reminder 應 401', async ({ request }) => {
    const resp = await request.get('/api/send-reminder')
    expect(resp.status()).toBe(401)
  })
})
