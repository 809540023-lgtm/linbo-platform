import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import IntroModal from '@/components/intro-modal'

// 首頁不要在 build 時靜態化（Supabase env 在 build 階段不可用會 throw）
// 並避免長期快取（之前 s-maxage=31536000 導致改首頁不會生效）
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const admin = createAdminClient()
  const { data: events } = await admin
    .from('events')
    .select('*')
    .order('start_at', { ascending: true })
    .limit(3)

  return (
    <>
      <IntroModal />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        {/* Header with avatar */}
        <div className="flex items-center gap-5">
          <img
            src="/linbo-avatar.jpg"
            alt="林博"
            className="h-24 w-24 rounded-full bg-teal-50 shadow-sm sm:h-28 sm:w-28"
          />
          <div>
            <p className="text-2xl font-bold text-zinc-900 sm:text-3xl">林博</p>
            <p className="mt-1 text-base font-medium text-amber-600 sm:text-lg">AI 理財 × 群眾智慧</p>
          </div>
        </div>

        {/* Hero — AI 理財 主軸 */}
        <section className="mt-10 space-y-5">
          <div className="inline-block rounded-full bg-amber-100 px-4 py-2 text-base font-bold text-amber-800 sm:text-lg">
            🤖 AI 理財新時代
          </div>
          <h1 className="text-5xl font-bold leading-tight text-zinc-900 sm:text-6xl">
            用 AI<br />
            <span className="text-amber-600">看見市場的另一面</span>
          </h1>
          <p className="text-2xl leading-relaxed text-zinc-700 sm:text-3xl">
            不是報明牌、不是選股課
          </p>
          <p className="text-lg leading-relaxed text-zinc-700 sm:text-xl">
            林博帶您體驗 <strong className="text-amber-700">15 個 AI 機器人</strong> 怎麼幫您看市場，
            把全場每個人的觀察整合成 <strong>集體共識</strong>，找出正在悄悄轉弱的訊號。
          </p>

          {/* CTAs — 手機垂直堆疊（避免擠），md+ 才橫排 */}
          <div className="flex flex-col gap-4 pt-2 md:flex-row md:flex-wrap md:gap-3">
            <Link
              href="/auth/login"
              className="rounded-2xl bg-amber-600 px-8 py-5 text-center text-xl font-bold text-white shadow-md hover:bg-amber-700 sm:text-2xl"
            >
              🎫 立即報名
            </Link>
            <Link
              href="/demo"
              className="rounded-2xl border-2 border-amber-300 bg-white px-8 py-5 text-center text-xl font-bold text-amber-700 hover:border-amber-500 sm:text-2xl"
            >
              🎬 看活動示範
            </Link>
            <Link
              href="/chat"
              className="rounded-2xl border-2 border-zinc-300 bg-white px-8 py-5 text-center text-xl font-bold text-zinc-900 hover:border-amber-500 sm:text-2xl"
            >
              💬 會員交流
            </Link>
          </div>
        </section>

        {/* 三種對象 */}
        <section className="mt-14 rounded-3xl border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-white p-6 sm:p-8">
          <h2 className="text-3xl font-bold text-zinc-900">🙋 這場活動適合誰？</h2>
          <p className="mt-2 text-lg text-zinc-600">三種人來最有收穫</p>

          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <span className="text-5xl">🌱</span>
              <div>
                <p className="text-2xl font-bold text-zinc-900">還沒進股市的人</p>
                <p className="mt-2 text-lg leading-relaxed text-zinc-700">
                  從 AI 怎麼看市場開始學——不用懂線圖、不用看財報，直接學會用 AI 工具理解世界。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <span className="text-5xl">📈</span>
              <div>
                <p className="text-2xl font-bold text-zinc-900">已經在股市的高手</p>
                <p className="mt-2 text-lg leading-relaxed text-zinc-700">
                  您的眼光只能看到熟悉的角度——這裡 15 個 AI 機器人 + 50 雙眼睛幫您掃描盲點。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <span className="text-5xl">🚀</span>
              <div>
                <p className="text-2xl font-bold text-zinc-900">想抓住前所未有機會的人</p>
                <p className="mt-2 text-lg leading-relaxed text-zinc-700">
                  AI 正在改寫所有產業的規則——理財方式也正在被重新定義，提早上車。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 現場玩法 3 步驟 */}
        <section className="mt-12 rounded-3xl bg-zinc-50 p-6 sm:p-8">
          <h2 className="text-3xl font-bold text-zinc-900">現場您只要做 3 件事</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <div className="text-5xl">📱</div>
              <p className="mt-3 text-xl font-bold text-zinc-900">1. 打開直播</p>
              <p className="mt-2 text-base text-zinc-600">手機網頁看主持人</p>
            </div>
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <div className="text-5xl">💬</div>
              <p className="mt-3 text-xl font-bold text-zinc-900">2. 分享觀察</p>
              <p className="mt-2 text-base text-zinc-600">一句話送出您的想法</p>
            </div>
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <div className="text-5xl">📉</div>
              <p className="mt-3 text-xl font-bold text-zinc-900">3. 看 AI 整合</p>
              <p className="mt-2 text-base text-zinc-600">即時排行 + 群眾共識</p>
            </div>
          </div>
          <p className="mt-6 rounded-xl bg-white p-4 text-lg leading-relaxed text-zinc-700">
            <strong>完全不懂 AI、不懂股票分析都沒關係</strong>——背後 15 個 AI 機器人會做困難的工作，您只要分享您腦中的想法。
          </p>
        </section>

        {/* 近期場次 */}
        {events && events.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-5 text-3xl font-bold text-zinc-900">📅 近期場次</h2>
            <div className="space-y-4">
              {events.map(e => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="block rounded-2xl border-2 border-amber-200 bg-white p-6 transition hover:border-amber-500 hover:shadow-md"
                >
                  <h3 className="text-2xl font-bold text-zinc-900">{e.title}</h3>
                  <p className="mt-3 text-lg text-zinc-700">
                    📅 {new Date(e.start_at).toLocaleString('zh-TW', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Taipei' })}
                  </p>
                  {e.location && <p className="mt-1 text-lg text-zinc-700">📍 {e.location}</p>}
                  <p className="mt-4 text-base font-bold text-amber-700">點此查看詳情 →</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 為什麼是這場 */}
        <section id="about" className="mt-12 space-y-4 rounded-3xl bg-zinc-50 p-6 sm:p-8">
          <h2 className="text-3xl font-bold text-zinc-900">為什麼是 AI 理財，不是專家明牌</h2>
          <p className="text-lg leading-relaxed text-zinc-700">
            一個分析師的眼睛只看到一個角度，<strong>100 個人的觀察可以涵蓋市場 100 種訊號</strong>。
            這場活動把每個人腦中的零碎拼圖匯集起來——有人發現籌碼異常、有人看到技術破壞、有人聽到產業傳言——由
            <strong className="text-amber-700"> AI 把這些觀察結構化、去重、排序</strong>，呈現出全場的「集體共識」。
          </p>
          <p className="text-lg leading-relaxed text-zinc-700">
            這不是預測未來，而是<strong>把分散的市場訊號集中到一張桌子上看</strong>。
            主持人不告訴您該買什麼，但會帶您看：當大家不約而同地擔心某檔股票時，那個擔心可能來自什麼。
          </p>
        </section>
      </main>
    </>
  )
}
