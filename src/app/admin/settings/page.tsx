export const dynamic = 'force-dynamic'

// 系統設定總覽：顯示目前所有環境設定 + 提供常用操作快捷
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/pending')

  const envs = [
    { key: 'Supabase URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL, sensitive: false },
    { key: 'Site URL', value: process.env.NEXT_PUBLIC_SITE_URL, sensitive: false },
    { key: 'Mux Playback ID', value: process.env.NEXT_PUBLIC_MUX_PLAYBACK_ID || '（未設定）', sensitive: false },
    { key: 'Anthropic API', value: process.env.ANTHROPIC_API_KEY ? '✅ 已設定' : '❌ 未設定', sensitive: true },
    { key: 'FinMind Token', value: process.env.FINMIND_TOKEN ? '✅ 已設定' : '❌ 未設定（Scout 無法跑）', sensitive: true },
    { key: 'Resend Email', value: process.env.RESEND_API_KEY ? '✅ 已設定' : '⚠️ 未設定（不會寄信）', sensitive: true },
    { key: 'LINE Bot', value: process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✅ 已設定' : '⚠️ 未設定（不會發 LINE）', sensitive: true },
    { key: 'CRON 防呆', value: process.env.CRON_SECRET ? '✅ 已設定' : '❌ 未設定', sensitive: true },
  ]

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold">系統設定</h1>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">環境變數狀態</h2>
        <table className="w-full overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2">項目</th>
              <th className="px-4 py-2">狀態</th>
            </tr>
          </thead>
          <tbody>
            {envs.map(e => (
              <tr key={e.key} className="border-t border-zinc-100">
                <td className="px-4 py-2 font-medium">{e.key}</td>
                <td className="px-4 py-2 text-zinc-600">{e.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-zinc-500">
          要改環境變數，到 Vercel Dashboard → Settings → Environment Variables，改完 Redeploy
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">快速連結</h2>
        <div className="grid grid-cols-2 gap-3">
          <a href="/admin/events" className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-amber-500">
            <strong>活動管理</strong>
            <p className="text-xs text-zinc-500">建活動 / 編輯 / 現場控制</p>
          </a>
          <a href="/admin/members" className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-amber-500">
            <strong>會員審核</strong>
            <p className="text-xs text-zinc-500">核可待審核會員</p>
          </a>
          <a href="/admin/monitor" className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-amber-500">
            <strong>系統監控</strong>
            <p className="text-xs text-zinc-500">看 AI Agent 健康度</p>
          </a>
          <a href="/admin" className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-amber-500">
            <strong>後台首頁</strong>
            <p className="text-xs text-zinc-500">統計總覽</p>
          </a>
        </div>
      </section>

      <section className="mt-8 rounded-lg bg-zinc-50 p-5 text-xs text-zinc-600">
        <p><strong>第一次部署完必做：</strong></p>
        <ol className="mt-2 list-decimal pl-5 space-y-1">
          <li>在 Supabase SQL Editor 跑 <code>supabase/migrations/00001_initial.sql</code></li>
          <li>用 Google 登入一次（會被導到 /pending）</li>
          <li>到 Supabase SQL Editor 跑：<br/>
            <code>update profiles set is_admin=true, account_status=&apos;approved&apos;, approved_at=now() where id=(select id from auth.users where email=&apos;您的Gmail&apos;);</code>
          </li>
          <li>重整本頁，您應該看得到</li>
        </ol>
      </section>
    </main>
  )
}
