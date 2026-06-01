export const dynamic = 'force-dynamic'

// 活動管理：列出所有活動，可新增/編輯/狀態切換
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminEventsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/pending')

  const { data: events } = await supabase.from('events').select('*').order('start_at', { ascending: false })

  const statusColor = (s: string) => ({
    upcoming: 'bg-amber-100 text-amber-700',
    live: 'bg-red-100 text-red-700 animate-pulse',
    ended: 'bg-zinc-100 text-zinc-600',
  } as any)[s] || 'bg-zinc-100'

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">活動管理</h1>
        <Link href="/admin/events/new" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
          + 新增活動
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-3">標題</th>
              <th className="px-4 py-3">開始時間</th>
              <th className="px-4 py-3">狀態</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {!events?.length ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-zinc-500">尚未建立任何活動，點右上方新增</td></tr>
            ) : events.map((e: any) => (
              <tr key={e.id} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium">{e.title}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">{new Date(e.start_at).toLocaleString('zh-TW')}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor(e.status)}`}>{e.status}</span>
                </td>
                <td className="px-4 py-3 text-right text-xs">
                  <Link href={`/admin/events/${e.id}/registrations`} className="mr-3 font-medium text-amber-700 underline">報名名單</Link>
                  <Link href={`/admin/events/${e.id}/live-control`} className="mr-3 text-amber-600 underline">現場控制</Link>
                  <Link href={`/admin/events/${e.id}/edit`} className="text-zinc-600 underline">編輯</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
