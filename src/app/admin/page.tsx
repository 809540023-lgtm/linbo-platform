export const dynamic = 'force-dynamic'

// 後台總覽：四大區塊快速進入
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin')
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/pending')

  const admin = createAdminClient()
  const [
    { count: members },
    { count: pendingMembers },
    { count: events },
    { count: messages },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'pending'),
    admin.from('events').select('*', { count: 'exact', head: true }),
    admin.from('messages').select('*', { count: 'exact', head: true }),
  ])

  const cards = [
    { href: '/admin/events', icon: '📅', title: '活動管理', sub: `${events || 0} 場活動`, color: 'amber' },
    { href: '/admin/members', icon: '👥', title: '會員審核', sub: `${pendingMembers || 0} 待審核 · ${members || 0} 總會員`, color: 'red' },
    { href: '/admin/research', icon: '🔬', title: '研究 Agents', sub: '15 個半導體供應鏈專家', color: 'purple' },
    { href: '/admin/monitor', icon: '📊', title: '系統監控', sub: `${messages || 0} 則訊息累計`, color: 'blue' },
    { href: '/admin/settings', icon: '⚙️', title: '系統設定', sub: '環境變數狀態 + 部署檢核', color: 'zinc' },
  ]

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold">林博平台後台</h1>
      <p className="mt-1 text-sm text-zinc-500">您好，{user.email}</p>

      <div className="mt-8 grid grid-cols-2 gap-4">
        {cards.map(c => (
          <Link
            key={c.href}
            href={c.href}
            className="block rounded-xl border border-zinc-200 bg-white p-6 hover:border-amber-500 hover:shadow-sm"
          >
            <div className="text-3xl">{c.icon}</div>
            <h2 className="mt-3 text-lg font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{c.sub}</p>
          </Link>
        ))}
      </div>

      {pendingMembers && pendingMembers > 0 ? (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          ⏳ 有 <strong>{pendingMembers}</strong> 位會員等候審核 — <Link href="/admin/members" className="underline">立即處理 →</Link>
        </div>
      ) : null}
    </main>
  )
}
