export const dynamic = 'force-dynamic'

// 新增活動
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function NewEventPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/pending')

  // 預設下週同時間
  const defaultStart = new Date(Date.now() + 7 * 86400000)
  defaultStart.setHours(13, 0, 0, 0)
  const defaultEnd = new Date(defaultStart.getTime() + 4 * 3600000)
  const toLocal = (d: Date) => {
    const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    return o.toISOString().slice(0, 16)
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold">新增活動</h1>

      <form action="/api/events" method="POST" className="mt-6 space-y-5">
        <Field label="標題" name="title" required defaultValue="林博的獨立思維：尋找最快掉落的那顆星星" />
        <Field label="描述" name="description" textarea defaultValue="當市場越熱，越多人只想問哪一檔會漲；林博的獨立思維，看的是那顆最可能、最快掉落的星星。" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="開始時間" name="start_at" type="datetime-local" required defaultValue={toLocal(defaultStart)} />
          <Field label="結束時間" name="end_at" type="datetime-local" defaultValue={toLocal(defaultEnd)} />
        </div>
        <Field label="YouTube 直播連結（可選，上線前再填）" name="livestream_url" placeholder="https://youtube.com/watch?v=XXXX 或留空" />
        <div>
          <label className="block text-sm font-medium">初始狀態</label>
          <select name="status" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" defaultValue="upcoming">
            <option value="upcoming">upcoming（即將開始）</option>
            <option value="live">live（進行中）</option>
            <option value="ended">ended（已結束）</option>
          </select>
        </div>

        <div className="flex gap-3">
          <a href="/admin/events" className="rounded-lg border border-zinc-300 px-5 py-2.5">取消</a>
          <button className="flex-1 rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-white hover:bg-amber-700">建立活動</button>
        </div>
      </form>
    </main>
  )
}

function Field({ label, name, type = 'text', defaultValue = '', textarea = false, required = false, placeholder = '' }: any) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      {textarea ? (
        <textarea name={name} required={required} defaultValue={defaultValue} placeholder={placeholder} rows={3}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
      ) : (
        <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
      )}
    </div>
  )
}
