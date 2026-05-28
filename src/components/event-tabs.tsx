'use client'
import { useState } from 'react'
import Link from 'next/link'

type Coffee = {
  no: string
  name: string
  en: string
  origin: string
  altitude: string
  variety: string
  process: string
  flavor: string
  story: string
  badge: string
}

type Props = {
  event: any
  registeredCount: number
  remaining: number | null
  isFull: boolean
  myReg: any
  user: any
  onsitePriceNow: number
  onlinePrice: number
  coffees: Coffee[]
  startDateStr: string
  eventId: string
}

const TABS_DEFAULT = [
  { id: 'about', label: '🎯 介紹', emoji: '🎯' },
  { id: 'price', label: '💰 票價', emoji: '💰' },
  { id: 'coffee', label: '☕ 咖啡', emoji: '☕' },
  { id: 'dessert', label: '🍰 甜點', emoji: '🍰' },
  { id: 'register', label: '📝 報名', emoji: '📝' },
] as const

const TAB_LIVE = { id: 'live', label: '📺 直播', emoji: '📺' } as const

type TabId = 'about' | 'price' | 'coffee' | 'dessert' | 'register' | 'live'

export default function EventTabs(props: Props) {
  const { event, registeredCount, remaining, isFull, myReg, user, onsitePriceNow, onlinePrice, coffees, startDateStr, eventId } = props

  const isLive = event.mux_status === 'active' && event.mux_playback_id
  const TABS: { id: TabId; label: string; emoji: string }[] = isLive && myReg
    ? [TAB_LIVE, ...TABS_DEFAULT]
    : [...TABS_DEFAULT]

  const [tab, setTab] = useState<TabId>(isLive && myReg ? 'live' : (myReg ? 'register' : 'about'))

  return (
    <div>
      {/* Tab Nav — 大顆好按 */}
      <nav className={`sticky top-0 z-10 -mx-2 mb-6 grid gap-1 rounded-2xl bg-zinc-100 p-1.5 shadow-sm ${
        TABS.length === 6 ? 'grid-cols-6' : TABS.length === 5 ? 'grid-cols-5' : 'grid-cols-4'
      }`}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-2 py-3 text-base font-semibold transition ${
              tab === t.id
                ? (t.id === 'live' ? 'animate-pulse bg-red-600 text-white shadow-md' : 'bg-amber-600 text-white shadow-md')
                : (t.id === 'live' ? 'bg-red-100 text-red-700' : 'text-zinc-700 hover:bg-white')
            }`}
          >
            <span className="text-2xl">{t.emoji}</span>
            <span className="ml-1 hidden sm:inline">{t.label.replace(/^\S+\s/, '')}</span>
          </button>
        ))}
      </nav>

      {tab === 'live' && (
        <section className="space-y-4">
          <header>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-red-600"></span>
              <h2 className="text-3xl font-bold text-zinc-900">直播中</h2>
            </div>
            <p className="mt-2 text-lg text-zinc-700">您正在看林博的現場 · 一邊看一邊在底下打字送出您的觀察</p>
          </header>

          <div className="overflow-hidden rounded-2xl border-2 border-zinc-800 bg-black shadow-lg">
            <iframe
              src={`https://player.mux.com/${event.mux_playback_id}?autoplay=muted&primary-color=%23f59e0b`}
              className="aspect-video w-full"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          </div>

          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
            <p className="text-lg font-bold text-amber-900">💬 把您的觀察打字送出</p>
            <p className="mt-2 text-base text-amber-800">
              覺得哪檔股票可能會跌？一句話送出，AI 會把全場 N 個人的觀察整合成排行榜。
            </p>
            <a
              href={`/host/${eventId}/control`}
              target="_blank"
              className="mt-3 inline-block rounded-xl bg-amber-600 px-5 py-3 text-lg font-bold text-white hover:bg-amber-700"
            >
              開啟觀察輸入面板 →
            </a>
          </div>
        </section>
      )}

      {/* === Tab 1：活動介紹 === */}
      {tab === 'about' && (
        <section className="space-y-6">
          <header>
            <div className="flex items-center gap-3">
              <img src="/linbo-avatar.jpg" alt="林博" className="h-14 w-14 rounded-full bg-teal-50 shadow-sm" />
              <div>
                <p className="text-lg font-bold text-zinc-900">林博</p>
                <p className="text-sm font-medium text-amber-600">群眾智慧 × AI 共創 · Pilot 場</p>
              </div>
            </div>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-zinc-900">
              {event.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-zinc-700">{event.description}</p>
          </header>

          {/* 3 步驟玩法 */}
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
            <h2 className="text-2xl font-bold text-amber-900">活動現場您只要做 3 件事</h2>
            <ol className="mt-5 space-y-4">
              <li className="flex items-start gap-4">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-2xl font-bold text-white">1</span>
                <div>
                  <p className="text-xl font-bold text-amber-900">看您手機上的直播</p>
                  <p className="mt-1 text-base text-zinc-700">手機網頁打開就能看主持人</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-2xl font-bold text-white">2</span>
                <div>
                  <p className="text-xl font-bold text-amber-900">分享您的觀察</p>
                  <p className="mt-1 text-base text-zinc-700">把「覺得可能會跌的觀察」打字送出（一句話就好）</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-2xl font-bold text-white">3</span>
                <div>
                  <p className="text-xl font-bold text-amber-900">看 AI 即時整合</p>
                  <p className="mt-1 text-base text-zinc-700">AI 把全場 N 個人的觀察整合成排行榜</p>
                </div>
              </li>
            </ol>
            <p className="mt-5 rounded-xl bg-white p-4 text-base leading-relaxed text-amber-900">
              <strong>完全不懂 AI、不懂股票分析都沒關係——</strong>
              後端 15 個 AI 機器人會做所有困難的工作，您只需要分享您腦中的想法。
            </p>
          </div>

          {/* 活動資訊 */}
          <div className="space-y-4 rounded-2xl border-2 border-zinc-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <span className="text-3xl">📅</span>
              <div>
                <p className="text-base font-medium text-zinc-500">日期時間</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900">{startDateStr}</p>
                <p className="mt-1 text-base text-zinc-600">活動全長約 3.5 小時</p>
              </div>
            </div>
            {event.location && (
              <div className="flex items-start gap-4 border-t border-zinc-100 pt-4">
                <span className="text-3xl">📍</span>
                <div>
                  <p className="text-base font-medium text-zinc-500">地點</p>
                  <p className="mt-1 text-xl leading-relaxed text-zinc-900">{event.location}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-4 border-t border-zinc-100 pt-4">
              <span className="text-3xl">👥</span>
              <div>
                <p className="text-base font-medium text-zinc-500">名額</p>
                <p className="mt-1 text-xl text-zinc-900">
                  已報名 <strong className="text-3xl text-amber-700">{registeredCount}</strong> /{' '}
                  {event.max_attendees || '不限'} 人
                </p>
                {remaining !== null && remaining > 0 && (
                  <p className="mt-1 text-base text-zinc-600">還剩 {remaining} 席</p>
                )}
                {isFull && <span className="mt-2 inline-block rounded bg-red-100 px-3 py-1 text-base text-red-700">已額滿</span>}
              </div>
            </div>
          </div>

          {/* 為什麼不一樣 */}
          <div className="rounded-2xl bg-zinc-50 p-6">
            <h2 className="text-2xl font-bold text-zinc-900">這場活動為什麼跟別人不一樣</h2>
            <ul className="mt-4 space-y-3 text-lg leading-relaxed text-zinc-700">
              <li>🔮 <strong>不是報明牌、不是選股課</strong>——主持人不告訴您要買什麼</li>
              <li>👥 <strong>每個人都是貢獻者</strong>——您腦中的觀察就是現場的原料</li>
              <li>🤖 <strong>背後 15 個 AI 機器人輔助</strong>——把零碎觀察整合成排行榜</li>
              <li>☕ <strong>現場限定的精品咖啡品鑑</strong>——三支稀有莊園豆，配湳的溫度手作甜點</li>
              <li>🎯 <strong>共同發現轉弱訊號</strong>——不是預測，是群體智慧的即時呈現</li>
            </ul>
          </div>

          <button
            onClick={() => setTab('register')}
            className="w-full rounded-2xl bg-amber-600 px-6 py-5 text-2xl font-bold text-white shadow-lg hover:bg-amber-700"
          >
            👉 我要報名（下一步）
          </button>
        </section>
      )}

      {/* === Tab 2：票價說明 === */}
      {tab === 'price' && (
        <section className="space-y-6">
          <header>
            <h2 className="text-3xl font-bold text-zinc-900">💰 票種與費用</h2>
            <p className="mt-2 text-lg text-zinc-600">選一個適合您的方式</p>
          </header>

          {/* 現場票 */}
          <div className="rounded-2xl border-4 border-amber-400 bg-amber-50 p-6 shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🎫</span>
              <div>
                <p className="text-base font-medium text-amber-700">現場票（最推薦）</p>
                <p className="text-4xl font-bold text-amber-900">NT$ {onsitePriceNow}</p>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-base text-amber-900">
              當天視人數分攤 NT$ 500 ~ NT$ 1,000，當天現場結算
            </p>
            <ul className="mt-4 space-y-2 text-lg leading-relaxed text-zinc-800">
              <li>✅ 現場互動體驗</li>
              <li>☕ <strong>含精品咖啡品鑑</strong>（3 支稀有莊園豆）</li>
              <li>🍰 含「湳的溫度」3 款手作甜點</li>
              <li>📺 含 7 天線上回放</li>
            </ul>
          </div>

          {/* 線上票 */}
          <div className="rounded-2xl border-2 border-zinc-300 bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="text-4xl">💻</span>
              <div>
                <p className="text-base font-medium text-zinc-600">線上直播票</p>
                <p className="text-4xl font-bold text-zinc-900">NT$ {onlinePrice}</p>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-base text-zinc-700">
              遠端參與 · 固定費用
            </p>
            <ul className="mt-4 space-y-2 text-lg leading-relaxed text-zinc-800">
              <li>📱 手機 / 電腦觀看直播</li>
              <li>💬 同步打字送出觀察</li>
              <li>📺 含 7 天線上回放</li>
              <li>📊 含 AI 個人化報告</li>
            </ul>
          </div>

          <div className="rounded-xl bg-zinc-50 p-5">
            <p className="text-base leading-relaxed text-zinc-700">
              💡 <strong>說明：</strong>現場票價依當天實際出席人數結算（總成本 NT$ 20,000 由現場人均分攤，上限 NT$ 1,000、下限 NT$ 500）。當天現場以現金或 LINE Pay 收取；線上票請於報名後 3 日內完成轉帳。
            </p>
          </div>

          <button
            onClick={() => setTab('coffee')}
            className="w-full rounded-2xl bg-amber-600 px-6 py-5 text-2xl font-bold text-white shadow-lg hover:bg-amber-700"
          >
            👉 看現場限定的咖啡（下一步）
          </button>
        </section>
      )}

      {/* === Tab 3：咖啡品鑑 === */}
      {tab === 'coffee' && (
        <section className="space-y-6">
          <header>
            <h2 className="text-3xl font-bold text-zinc-900">☕ 精品咖啡品鑑會</h2>
            <p className="mt-2 text-lg text-amber-700">Specialty Coffee Tasting · 現場限定</p>
            <p className="mt-3 text-lg leading-relaxed text-zinc-700">
              三支稀有莊園豆 · 三種處理法 × 三支稀有品種 × 三種海拔層次
            </p>
          </header>

          <div className="space-y-5">
            {coffees.map(c => (
              <div key={c.no} className="rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-800">{c.no}</span>
                  <div>
                    <p className="text-sm font-medium text-amber-600">{c.badge}</p>
                    <h3 className="text-xl font-bold text-zinc-900">{c.name}</h3>
                    <p className="mt-1 text-sm italic text-zinc-500">{c.en}</p>
                  </div>
                </div>
                <dl className="mt-4 grid gap-y-2 text-base">
                  <div><dt className="inline font-medium text-zinc-500">產區：</dt><dd className="inline text-zinc-800">{c.origin}</dd></div>
                  <div><dt className="inline font-medium text-zinc-500">海拔：</dt><dd className="inline text-zinc-800">{c.altitude}</dd></div>
                  <div><dt className="inline font-medium text-zinc-500">品種：</dt><dd className="inline text-zinc-800">{c.variety}</dd></div>
                  <div><dt className="inline font-medium text-zinc-500">處理法：</dt><dd className="inline text-zinc-800">{c.process}</dd></div>
                </dl>
                <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-base leading-relaxed text-amber-900">
                  <strong>♪ 風味：</strong>{c.flavor}
                </p>
                <p className="mt-2 text-base leading-relaxed text-zinc-600">
                  <strong>❦ 故事：</strong>{c.story}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setTab('dessert')}
            className="w-full rounded-2xl bg-amber-600 px-6 py-5 text-2xl font-bold text-white shadow-lg hover:bg-amber-700"
          >
            👉 看搭配的甜點（下一步）
          </button>
        </section>
      )}

      {/* === Tab 4：湳的溫度甜點 === */}
      {tab === 'dessert' && (
        <section className="space-y-6">
          <header>
            <h2 className="text-3xl font-bold text-zinc-900">🍰 湳的溫度 · 手作甜品</h2>
            <p className="mt-2 text-lg text-pink-700">Sweet Collection · 現場限定</p>
            <p className="mt-3 text-lg leading-relaxed text-zinc-700">
              三款手作甜點，搭配三支精品咖啡——用手作傳遞溫暖、嚴選天然食材。
            </p>
          </header>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border-2 border-purple-200 bg-white shadow-sm">
              <img src="/dessert-blueberry.jpg" alt="藍莓雲語" className="aspect-[4/3] w-full bg-purple-50 object-cover" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-purple-600">湳的溫度 · Bleu</p>
                    <h3 className="text-2xl font-bold text-purple-900">🫐 藍莓雲語</h3>
                    <p className="mt-1 text-base italic text-zinc-500">鮮果慢熬法式慕斯蛋糕</p>
                  </div>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">100% 鮮果</span>
                </div>
                <p className="mt-4 text-base leading-relaxed text-zinc-700">
                  慢熬藍莓的溫柔，化成一層層雲朵般的幸福。鮮藍莓果泥新鮮熬煮，無色素、無香精，法式工藝慢火熬製，如雲朵般輕柔入口即化。
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-sm">
              <img src="/dessert-chocolate.jpg" alt="72% 生巧克力塔" className="aspect-[4/3] w-full bg-amber-50 object-cover" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-amber-700">湳的溫度 · Nama Chocolate</p>
                    <h3 className="text-2xl font-bold text-amber-900">🍫 72% 生巧克力塔</h3>
                    <p className="mt-1 text-base italic text-zinc-500">72% Nama Chocolate Tart</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">大人味</span>
                </div>
                <p className="mt-4 text-base leading-relaxed text-zinc-700">
                  嚴選 72% 頂級黑巧克力，低糖配方濃郁不苦澀。絲滑生巧內餡入口即化，搭配奶香酥脆手工塔皮，無人工色素、無添加。
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border-2 border-green-200 bg-white shadow-sm">
              <img src="/dessert-quiche.jpg" alt="主廚異國風浪漫鹹派" className="aspect-[4/3] w-full bg-green-50 object-cover" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-green-700">湳的溫度 · Chef's Quiche</p>
                    <h3 className="text-2xl font-bold text-green-900">🥧 主廚異國風浪漫鹹派</h3>
                    <p className="mt-1 text-base italic text-zinc-500">層層美味 × 天然食材 × 手工製作</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">鹹點補充</span>
                </div>
                <p className="mt-4 text-base leading-relaxed text-zinc-700">
                  天然乳酪濃郁香醇、新鮮雞蛋無抗生素、在地菇類、當季蔬菜、天然香草，融合異國風味與在地新鮮蔬菜，手工酥脆派皮包裹滿滿餡料，清爽不膩。
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-base italic text-pink-600">
            ✦ 用手作傳遞溫暖，讓甜點成為生活中的美好記憶 ✦
          </p>

          <button
            onClick={() => setTab('register')}
            className="w-full rounded-2xl bg-amber-600 px-6 py-5 text-2xl font-bold text-white shadow-lg hover:bg-amber-700"
          >
            👉 我要報名（最後一步）
          </button>
        </section>
      )}

      {/* === Tab 5：立即報名 === */}
      {tab === 'register' && (
        <section className="space-y-6">
          <header>
            <h2 className="text-3xl font-bold text-zinc-900">📝 立即報名</h2>
            <p className="mt-2 text-lg text-amber-700">Pilot 場限熟人推薦——確保現場品質</p>
          </header>

          {myReg ? (
            <>
              <div className="rounded-2xl border-4 border-green-400 bg-green-50 p-6">
                <p className="text-3xl font-bold text-green-800">✅ 您已報名成功</p>
                <p className="mt-3 text-xl text-green-900">
                  您是第 <strong className="text-5xl">{registeredCount}</strong> 位報名者
                </p>
                <p className="mt-4 text-lg text-green-900">
                  目前票種：<strong>{myReg.ticket_type === 'online' ? `💻 線上直播票 NT$ ${onlinePrice}` : `🎫 現場票 NT$ ${onsitePriceNow}（當天結算）`}</strong>
                </p>
                <p className="mt-4 text-lg leading-relaxed text-green-700">
                  活動前 3 日會 Email 通知您詳細地點 / 線上連結與付款方式。當天 13:30 準時開始。
                </p>
              </div>

              <form action={`/events/${eventId}/register`} method="POST" className="space-y-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
                <p className="rounded-lg bg-white px-4 py-3 text-base text-zinc-700">
                  💡 以下是您的報名資訊，可以隨時修改後重新送出
                </p>

                <div>
                  <label className="mb-3 block text-lg font-bold text-zinc-800">
                    ① 選擇票種 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border-4 border-zinc-200 bg-white p-4 hover:border-amber-500">
                      <input type="radio" name="ticket_type" value="onsite" required defaultChecked={myReg.ticket_type !== 'online'} className="mt-1.5 h-5 w-5" />
                      <div>
                        <p className="text-xl font-bold text-zinc-900">🎫 現場票</p>
                        <p className="mt-1 text-lg font-semibold text-amber-700">NT$ {onsitePriceNow}</p>
                        <p className="text-base text-zinc-500">當天結算 · 含咖啡 + 甜點</p>
                      </div>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border-4 border-zinc-200 bg-white p-4 hover:border-amber-500">
                      <input type="radio" name="ticket_type" value="online" required defaultChecked={myReg.ticket_type === 'online'} className="mt-1.5 h-5 w-5" />
                      <div>
                        <p className="text-xl font-bold text-zinc-900">💻 線上票</p>
                        <p className="mt-1 text-lg font-semibold text-zinc-700">NT$ {onlinePrice}</p>
                        <p className="text-base text-zinc-500">含 7 天回放</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-lg font-bold text-zinc-800">
                    ② 推薦人姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="referrer_name"
                    required
                    defaultValue={myReg.referrer_name || ''}
                    placeholder="例：王小明"
                    className="w-full rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-lg focus:border-amber-500 focus:outline-none"
                  />
                  <p className="mt-2 text-base text-zinc-600">沒有推薦人？請在備註欄留言</p>
                </div>

                <div>
                  <label className="mb-2 block text-lg font-bold text-zinc-800">③ 您與推薦人的關係</label>
                  <select name="referrer_relation" defaultValue={myReg.referrer_relation || ''} className="w-full rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-lg">
                    <option value="">請選擇</option>
                    <option>同事</option>
                    <option>朋友</option>
                    <option>家人</option>
                    <option>客戶 / 合作夥伴</option>
                    <option>投資 / 學習社團</option>
                    <option>其他</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-lg font-bold text-zinc-800">④ 您的聯絡電話</label>
                  <input
                    name="attendee_phone"
                    type="tel"
                    defaultValue={myReg.attendee_phone || ''}
                    placeholder="0912-345-678"
                    className="w-full rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-lg"
                  />
                  <p className="mt-2 text-base text-zinc-600">活動當天臨時聯繫用，僅工作人員可見</p>
                </div>

                <div>
                  <label className="mb-2 block text-lg font-bold text-zinc-800">⑤ LINE ID（選填）</label>
                  <input
                    name="line_id"
                    type="text"
                    defaultValue={myReg.line_id || ''}
                    placeholder="例：linbo_friends"
                    className="w-full rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-lg"
                  />
                  <p className="mt-2 text-base text-zinc-600">方便活動後我們建群、寄活動花絮給您</p>
                </div>

                <div>
                  <label className="mb-2 block text-lg font-bold text-zinc-800">⑥ 想跟我們說的話（可空）</label>
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={myReg.notes || ''}
                    placeholder="飲食偏好、特殊需求、咖啡偏好（淺/中/深焙）..."
                    className="w-full resize-none rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-lg"
                  />
                </div>

                <button className="w-full rounded-2xl bg-amber-600 px-6 py-5 text-2xl font-bold text-white shadow-lg hover:bg-amber-700">
                  💾 更新報名資料
                </button>
              </form>
            </>
          ) : isFull ? (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-6 text-center">
              <p className="text-2xl font-bold text-red-700">很抱歉，本場已額滿</p>
              <p className="mt-2 text-lg text-red-600">下一場將於 6 月中旬開放，請關注後續通知</p>
            </div>
          ) : !user ? (
            <div className="rounded-2xl border-2 border-zinc-200 bg-white p-6 text-center">
              <p className="mb-5 text-xl text-zinc-700">先登入再報名 · 用 Google 一鍵登入最快</p>
              <Link href={`/auth/login?next=/events/${eventId}`}
                className="inline-block rounded-2xl bg-zinc-900 px-8 py-4 text-xl font-bold text-white hover:bg-zinc-800">
                登入 / 註冊
              </Link>
            </div>
          ) : (
            <form action={`/events/${eventId}/register`} method="POST" className="space-y-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
              <div>
                <label className="mb-3 block text-lg font-bold text-zinc-800">
                  ① 選擇票種 <span className="text-red-500">*</span>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border-4 border-zinc-200 bg-white p-4 hover:border-amber-500">
                    <input type="radio" name="ticket_type" value="onsite" required defaultChecked className="mt-1.5 h-5 w-5" />
                    <div>
                      <p className="text-xl font-bold text-zinc-900">🎫 現場票</p>
                      <p className="mt-1 text-lg font-semibold text-amber-700">NT$ {onsitePriceNow}</p>
                      <p className="text-base text-zinc-500">當天結算 · 含咖啡 + 甜點</p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border-4 border-zinc-200 bg-white p-4 hover:border-amber-500">
                    <input type="radio" name="ticket_type" value="online" required className="mt-1.5 h-5 w-5" />
                    <div>
                      <p className="text-xl font-bold text-zinc-900">💻 線上票</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-700">NT$ {onlinePrice}</p>
                      <p className="text-base text-zinc-500">含 7 天回放</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-lg font-bold text-zinc-800">
                  ② 推薦人姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  name="referrer_name"
                  required
                  placeholder="例：王小明"
                  className="w-full rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-lg focus:border-amber-500 focus:outline-none"
                />
                <p className="mt-2 text-base text-zinc-600">沒有推薦人？請在備註欄留言</p>
              </div>

              <div>
                <label className="mb-2 block text-lg font-bold text-zinc-800">③ 您與推薦人的關係</label>
                <select name="referrer_relation" className="w-full rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-lg">
                  <option value="">請選擇</option>
                  <option>同事</option>
                  <option>朋友</option>
                  <option>家人</option>
                  <option>客戶 / 合作夥伴</option>
                  <option>投資 / 學習社團</option>
                  <option>其他</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-lg font-bold text-zinc-800">④ 您的聯絡電話</label>
                <input
                  name="attendee_phone"
                  type="tel"
                  placeholder="0912-345-678"
                  className="w-full rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-lg"
                />
                <p className="mt-2 text-base text-zinc-600">活動當天臨時聯繫用，僅工作人員可見</p>
              </div>

              <div>
                <label className="mb-2 block text-lg font-bold text-zinc-800">⑤ LINE ID（選填）</label>
                <input
                  name="line_id"
                  type="text"
                  placeholder="例：linbo_friends"
                  className="w-full rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-lg"
                />
                <p className="mt-2 text-base text-zinc-600">方便活動後我們建群、寄活動花絮給您</p>
              </div>

              <div>
                <label className="mb-2 block text-lg font-bold text-zinc-800">⑥ 想跟我們說的話（可空）</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="飲食偏好、特殊需求、咖啡偏好（淺/中/深焙）..."
                  className="w-full resize-none rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-lg"
                />
              </div>

              <button className="w-full rounded-2xl bg-amber-600 px-6 py-5 text-2xl font-bold text-white shadow-lg hover:bg-amber-700">
                ✅ 確認報名
              </button>
              <p className="text-center text-base text-zinc-600">
                本平台為教學交流性質，所有內容不構成任何投資建議。
              </p>
            </form>
          )}
        </section>
      )}
    </div>
  )
}
