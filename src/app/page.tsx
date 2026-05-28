import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const admin = createAdminClient()
  const { data: events } = await admin
    .from('events')
    .select('*')
    .order('start_at', { ascending: true })
    .limit(3)

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <img
            src="/linbo-avatar.jpg"
            alt="林博"
            className="h-20 w-20 rounded-full bg-teal-50 shadow-sm md:h-24 md:w-24"
          />
          <div>
            <p className="text-xl font-bold text-zinc-900 md:text-2xl">林博</p>
            <p className="text-sm font-medium text-amber-600 md:text-base">群眾智慧 × AI 共創座談會</p>
          </div>
        </div>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">
          一起找出那顆<br />
          <span className="text-amber-600">會墜落的星</span>
        </h1>
        <p className="text-lg leading-relaxed text-zinc-700">
          不是報明牌、不是選股課。<br />
          把<strong>每個人腦中的零碎觀察</strong>匯集起來，
          由 <strong>AI 即時整合</strong>，
          讓大家一起發現市場上正在悄悄轉弱的訊號。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/auth/login" className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800">
            立即報名
          </Link>
          <Link href="/demo" className="rounded-lg bg-amber-500 px-6 py-3 font-medium text-white hover:bg-amber-600">
            🎬 看活動現場示範
          </Link>
          <Link href="/chat" className="rounded-lg border border-zinc-300 bg-white px-6 py-3 font-medium text-zinc-900 hover:border-amber-500">
            💬 會員交流
          </Link>
        </div>
      </div>

      {/* 3 步驟說明 — AI 小白友善 */}
      <section className="mt-12 rounded-2xl bg-zinc-50 p-6">
        <h2 className="text-xl font-bold">現場您只要做 3 件事</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-4">
            <div className="text-2xl">📱</div>
            <p className="mt-2 font-semibold">1. 打開直播</p>
            <p className="mt-1 text-sm text-zinc-600">手機網頁看主持人</p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <div className="text-2xl">💬</div>
            <p className="mt-2 font-semibold">2. 分享觀察</p>
            <p className="mt-1 text-sm text-zinc-600">一句話送出您的想法</p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <div className="text-2xl">📉</div>
            <p className="mt-2 font-semibold">3. 看 AI 整合</p>
            <p className="mt-1 text-sm text-zinc-600">即時排行 + 群眾共識</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-zinc-600">
          完全不懂 AI、不懂股票分析都沒關係——背後 15 個 AI 機器人會做困難的工作。
        </p>
      </section>

      {events && events.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">近期場次</h2>
          <div className="space-y-3">
            {events.map(e => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-5 hover:border-amber-500 hover:shadow-sm"
              >
                <h3 className="font-semibold">{e.title}</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  📅 {new Date(e.start_at).toLocaleString('zh-TW', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Taipei' })}
                </p>
                {e.location && <p className="text-sm text-zinc-600">📍 {e.location}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="about" className="mt-12 space-y-4 text-zinc-700">
        <h2 className="text-xl font-semibold text-zinc-900">為什麼是群眾智慧而不是專家明牌</h2>
        <p>
          一個分析師的眼睛只看到一個角度，但 100 個人的觀察可以涵蓋市場 100 種訊號。
          這場活動把每個人腦中的零碎拼圖匯集起來——有人發現籌碼異常、有人看到技術破壞、有人聽到產業傳言——
          由 AI 把這些觀察結構化、去重、排序，呈現出全場的「集體共識」。
        </p>
        <p>
          這不是預測未來，而是<strong>把分散的市場訊號集中到一張桌子上看</strong>。
          主持人不告訴您該買什麼，但會帶您看：當大家不約而同地擔心某檔股票時，那個擔心可能來自什麼。
        </p>
      </section>
    </main>
  )
}
