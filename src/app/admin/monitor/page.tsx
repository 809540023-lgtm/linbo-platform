export const dynamic = 'force-dynamic'

// 管理員監控儀表板：看 AI Agent 跑了沒、Scout 抓到什麼、訊息流量
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function MonitorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/pending')

  const admin = createAdminClient()

  // 全站統計
  const [
    { count: totalMembers },
    { count: pendingMembers },
    { count: totalMessages },
    { count: unprocessedMessages },
    { count: webResearchMessages },
    { count: totalRankings },
    { count: totalReports },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'pending'),
    admin.from('messages').select('*', { count: 'exact', head: true }),
    admin.from('messages').select('*', { count: 'exact', head: true }).eq('ai_processed', false),
    admin.from('messages').select('*', { count: 'exact', head: true }).eq('source', 'web_research'),
    admin.from('bearish_rankings').select('*', { count: 'exact', head: true }),
    admin.from('reports').select('*', { count: 'exact', head: true }),
  ])

  // 最近 24 小時各種事件
  const since = new Date(Date.now() - 86400000).toISOString()
  const [
    { count: msgs24h },
    { count: scout24h },
    { data: latestMessages },
    { data: latestRankings },
  ] = await Promise.all([
    admin.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', since),
    admin.from('messages').select('*', { count: 'exact', head: true })
      .eq('source', 'web_research').gte('created_at', since),
    admin.from('messages').select('id, content, source, created_at, stock_code, ai_processed')
      .order('created_at', { ascending: false }).limit(20),
    admin.from('bearish_rankings').select('stock_code, stock_name, bearish_score, updated_at')
      .order('updated_at', { ascending: false }).limit(10),
  ])

  const stats = [
    { label: '總會員', value: totalMembers || 0, sub: `${pendingMembers || 0} 待審核` },
    { label: '總訊息', value: totalMessages || 0, sub: `近 24h +${msgs24h || 0}` },
    { label: '網路爬蟲', value: webResearchMessages || 0, sub: `近 24h +${scout24h || 0}` },
    { label: 'AI 待處理', value: unprocessedMessages || 0, sub: '應 < 10' },
    { label: '排行股數', value: totalRankings || 0, sub: '累計分析過的股票' },
    { label: '已生報告', value: totalReports || 0, sub: '個人化 AI 報告數' },
  ]

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 系統監控</h1>
        <span className="text-xs text-zinc-500">
          快照：{new Date().toLocaleString('zh-TW')}（重整頁面更新）
        </span>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-lg bg-zinc-50 p-4">
            <div className="text-xs text-zinc-500">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs text-zinc-500">{s.sub}</div>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">⚠️ AI Agent 健康度</h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
          {unprocessedMessages && unprocessedMessages > 20 ? (
            <p className="text-red-600">
              🔴 <strong>異常：</strong>有 {unprocessedMessages} 則訊息待處理（&gt; 20）。
              可能 Agent A 沒在跑——檢查 Vercel Dashboard → Crons
            </p>
          ) : unprocessedMessages && unprocessedMessages > 5 ? (
            <p className="text-amber-600">
              🟡 <strong>注意：</strong>{unprocessedMessages} 則訊息待處理，Agent A 下次 cron 會處理
            </p>
          ) : (
            <p className="text-green-600">
              🟢 <strong>正常：</strong>所有訊息都已被 Agent A 解析
            </p>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">最近 20 則訊息</h2>
          <ul className="space-y-2 text-sm">
            {latestMessages?.map(m => (
              <li key={m.id} className="rounded border border-zinc-200 bg-white p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 ${
                    m.source === 'member' ? 'bg-amber-100 text-amber-700' :
                    m.source === 'web_research' ? 'bg-blue-100 text-blue-700' :
                    'bg-zinc-100'
                  }`}>{m.source}</span>
                  {m.stock_code && <span className="text-zinc-500">{m.stock_code}</span>}
                  {!m.ai_processed && <span className="text-amber-600">⏳ 待解析</span>}
                </div>
                <p className="mt-1 line-clamp-2">{m.content}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">最新排行 Top 10</h2>
          <ul className="space-y-1 text-sm">
            {latestRankings?.map(r => (
              <li key={r.stock_code} className="flex items-center justify-between rounded border border-zinc-200 bg-white p-2">
                <span>{r.stock_name} <span className="text-xs text-zinc-500">{r.stock_code}</span></span>
                <span className="font-bold text-red-600">{Math.round(r.bearish_score)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-lg bg-zinc-50 p-4 text-xs text-zinc-600">
        <p><strong>檢核項目：</strong></p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>「AI 待處理」應該 &lt; 10，超過代表 cron 沒跑</li>
          <li>「網路爬蟲 24h」如果是 0，代表 Scout 沒跑或 FinMind token 沒設</li>
          <li>「待審核」會員每天看一次，避免熱情粉絲等太久</li>
        </ul>
      </section>
    </main>
  )
}
