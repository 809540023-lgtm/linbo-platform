// 後台：某活動的報名名單
// 顯示完整資訊 + CSV 下載 + 切換已付款狀態
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RegistrationsTable from './table'

export const dynamic = 'force-dynamic'

export default async function AdminRegistrationsPage({
  params,
}: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/pending')

  const admin = createAdminClient()

  // 抓活動
  const { data: event } = await admin
    .from('events')
    .select('id, title, start_at, location, max_attendees, status')
    .eq('id', params.id)
    .single()

  if (!event) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-zinc-500">找不到活動。</p>
        <Link href="/admin/events" className="text-amber-600 underline">← 回活動列表</Link>
      </main>
    )
  }

  // 抓所有報名（包含個人資料）
  const { data: regs } = await admin
    .from('registrations')
    .select('id, user_id, ticket_type, price_quoted, paid, referrer_name, referrer_relation, attendee_phone, line_id, notes, registered_at')
    .eq('event_id', params.id)
    .order('registered_at', { ascending: true })

  // 串 profiles + auth.users.email
  const userIds = (regs || []).map(r => r.user_id)
  const profilesMap = new Map<string, { display_name?: string | null }>()
  const emailMap = new Map<string, string>()

  if (userIds.length) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)
    for (const p of profiles || []) profilesMap.set(p.id, p)

    // auth.users 的 email 要逐筆抓（admin API 沒有批次 by-id）
    // 改用 listUsers 配 perPage 100（夠 Pilot 用）
    const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    for (const u of usersList?.users || []) {
      if (u.email) emailMap.set(u.id, u.email)
    }
  }

  const rows = (regs || []).map(r => ({
    id: r.id,
    user_id: r.user_id,
    registered_at: r.registered_at,
    ticket_type: r.ticket_type,
    price_quoted: r.price_quoted,
    paid: !!r.paid,
    display_name: profilesMap.get(r.user_id)?.display_name || '',
    email: emailMap.get(r.user_id) || '',
    attendee_phone: r.attendee_phone || '',
    line_id: r.line_id || '',
    referrer_name: r.referrer_name || '',
    referrer_relation: r.referrer_relation || '',
    notes: r.notes || '',
  }))

  const totalCount = rows.length
  const onsiteCount = rows.filter(r => r.ticket_type === 'onsite').length
  const onlineCount = rows.filter(r => r.ticket_type === 'online').length
  const paidCount = rows.filter(r => r.paid).length
  const totalRevenue = rows.reduce((sum, r) => sum + (r.paid ? r.price_quoted : 0), 0)
  const pendingRevenue = rows.reduce((sum, r) => sum + (!r.paid ? r.price_quoted : 0), 0)

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4">
        <Link href="/admin/events" className="text-sm text-amber-600 underline">← 活動列表</Link>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">報名名單</h1>
        <p className="mt-1 text-sm text-zinc-600">{event.title}</p>
        <p className="text-xs text-zinc-500">
          {new Date(event.start_at).toLocaleString('zh-TW', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Taipei' })}
          {event.location && ` · ${event.location}`}
        </p>
      </header>

      {/* 統計卡 */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="總報名" value={totalCount} hint={event.max_attendees ? `/ ${event.max_attendees}` : ''} />
        <Stat label="🪑 現場" value={onsiteCount} />
        <Stat label="💻 線上" value={onlineCount} />
        <Stat label="✅ 已收款" value={`NT$ ${totalRevenue.toLocaleString()}`} hint={`${paidCount} 人`} />
        <Stat label="⏳ 未收款" value={`NT$ ${pendingRevenue.toLocaleString()}`} hint={`${totalCount - paidCount} 人`} />
      </div>

      {/* 表格 + CSV */}
      <RegistrationsTable eventId={params.id} eventTitle={event.title} rows={rows} />
    </main>
  )
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
    </div>
  )
}
