export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function EventsPage() {
  const supabase = createClient()
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('start_at', { ascending: true })

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold">所有場次</h1>
      <p className="mt-2 text-zinc-600">林博的 AI 台股智慧座談會列表</p>

      <ul className="mt-6 space-y-3">
        {events?.map(e => (
          <li key={e.id}>
            <Link href={`/events/${e.id}`} className="block rounded-lg border border-zinc-200 bg-white p-5 hover:border-amber-500">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{e.title}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  e.status === 'live' ? 'bg-red-100 text-red-700' :
                  e.status === 'upcoming' ? 'bg-amber-100 text-amber-700' :
                  'bg-zinc-100 text-zinc-600'
                }`}>{e.status}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">{e.description}</p>
              <p className="mt-2 text-xs text-zinc-500">
                {new Date(e.start_at).toLocaleString('zh-TW', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </Link>
          </li>
        ))}
        {(!events || events.length === 0) && (
          <li className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
            目前沒有活動
          </li>
        )}
      </ul>
    </main>
  )
}
