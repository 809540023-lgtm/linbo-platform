export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: registrations } = await supabase
    .from('registrations')
    .select('*, events(*)')
    .eq('user_id', user.id)
    .order('registered_at', { ascending: false })

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">會員中心</h1>
        <form action="/auth/logout" method="POST">
          <button className="text-sm text-zinc-500 hover:text-zinc-900">登出</button>
        </form>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-500">個人資料</h2>
        <div className="mt-2 space-y-1 text-sm">
          <div><strong>暱稱：</strong>{profile?.display_name || '未設定'}</div>
          <div><strong>Email：</strong>{user.email}</div>
          <div><strong>會員等級：</strong>{profile?.member_tier || 'free'}</div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">我的報名</h2>
        {!registrations || registrations.length === 0 ? (
          <p className="text-zinc-500">尚未報名任何活動。 <Link href="/events" className="text-amber-600 underline">看看近期場次</Link></p>
        ) : (
          <ul className="space-y-3">
            {registrations.map((r: any) => (
              <li key={r.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <Link href={`/events/${r.event_id}/live`} className="block">
                  <h3 className="font-medium">{r.events?.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {new Date(r.events?.start_at).toLocaleString('zh-TW', { dateStyle: 'long', timeStyle: 'short' })}
                  </p>
                  <span className="mt-2 inline-block text-xs text-amber-600">進入直播 →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
