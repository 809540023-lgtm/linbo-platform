// 活動詳情頁 + 報名表單（社群共創定位、AI 小白友善）
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('*').eq('id', params.id).single()
  if (!event) return <main className="p-12">找不到此活動</main>

  const { count: registeredCount } = await admin.from('registrations')
    .select('*', { count: 'exact', head: true }).eq('event_id', params.id)

  let myReg: any = null
  if (user) {
    const { data } = await admin.from('registrations')
      .select('*').eq('event_id', params.id).eq('user_id', user.id).maybeSingle()
    myReg = data
  }

  const isFull = event.max_attendees && (registeredCount || 0) >= event.max_attendees
  const remaining = event.max_attendees ? Math.max(0, event.max_attendees - (registeredCount || 0)) : null
  const startDate = new Date(event.start_at)

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← 回首頁</Link>

      <header className="mt-4">
        <p className="text-xs font-medium text-amber-600">群眾智慧 × AI 共創座談會 · Pilot 場</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">{event.title}</h1>
        <p className="mt-3 leading-relaxed text-zinc-700">{event.description}</p>
      </header>

      {/* 玩法 3 步說明（AI 小白友善） */}
      <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-sm font-bold text-amber-900">活動現場您只要做 3 件事</h2>
        <div className="mt-3 space-y-2 text-sm text-amber-900">
          <div className="flex gap-2"><span className="font-bold">1️⃣</span><p>看您手機上的直播</p></div>
          <div className="flex gap-2"><span className="font-bold">2️⃣</span><p>把您「覺得可能會跌的觀察」打字送出（一句話就好）</p></div>
          <div className="flex gap-2"><span className="font-bold">3️⃣</span><p>看 AI 把全場 N 個人的觀察整合成排行榜</p></div>
        </div>
        <p className="mt-3 text-xs text-amber-800">
          完全不懂 AI、不懂股票分析都沒關係——後端 15 個 AI 機器人會做所有困難的工作，您只需要分享您腦中的想法。
        </p>
      </section>

      <section className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">📅</span>
          <div>
            <p className="text-xs font-medium text-zinc-500">日期時間</p>
            <p className="text-lg font-semibold">
              {startDate.toLocaleString('zh-TW', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Taipei' })}
            </p>
            <p className="text-sm text-zinc-600">活動全長約 3.5 小時</p>
          </div>
        </div>
        {event.location && (
          <div className="flex items-start gap-3">
            <span className="text-xl">📍</span>
            <div>
              <p className="text-xs font-medium text-zinc-500">地點</p>
              <p className="leading-relaxed">{event.location}</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <span className="text-xl">👥</span>
          <div>
            <p className="text-xs font-medium text-zinc-500">名額</p>
            <p>
              已報名 <strong className="text-amber-700">{registeredCount || 0}</strong> /{' '}
              {event.max_attendees || '不限'} 人
              {remaining !== null && remaining > 0 && <span className="ml-1 text-sm text-zinc-600">（剩餘 {remaining} 席）</span>}
              {isFull && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">已額滿</span>}
            </p>
          </div>
        </div>
      </section>

      {myReg ? (
        <section className="mt-6 rounded-xl border-2 border-green-400 bg-green-50 p-5">
          <p className="text-lg font-bold text-green-800">✅ 報名成功</p>
          <p className="mt-2 text-base text-green-900">
            您是第 <strong className="text-3xl">{registeredCount}</strong> 位報名者
          </p>
          <p className="mt-2 text-sm text-green-700">
            活動前 3 日會 Email 通知您詳細地點。當天 13:30 準時開始，請提早 10 分鐘到場領取胸貼名牌。
          </p>
          {myReg.referrer_name && (
            <p className="mt-3 rounded bg-white px-2 py-1 text-xs text-green-700">
              推薦人：{myReg.referrer_name}
              {myReg.referrer_relation && ` · ${myReg.referrer_relation}`}
            </p>
          )}
        </section>
      ) : isFull ? (
        <section className="mt-6 rounded-xl border border-red-300 bg-red-50 p-5 text-center">
          <p className="font-medium text-red-700">很抱歉，本場已額滿</p>
          <p className="mt-1 text-sm text-red-600">下一場將於 6 月中旬開放，請關注後續通知</p>
        </section>
      ) : !user ? (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 text-center">
          <p className="mb-3 text-zinc-700">先登入再報名 · 用 Google 一鍵登入最快</p>
          <Link href={`/auth/login?next=/events/${params.id}`}
            className="inline-block rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800">
            登入 / 註冊
          </Link>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-900">立即報名（免費）</h2>
          <p className="mt-1 text-sm text-amber-700">Pilot 場限熟人推薦——確保現場品質、避免廣告帳號混入</p>

          <form action={`/events/${params.id}/register`} method="POST" className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                推薦人姓名 <span className="text-red-500">*</span>
              </label>
              <input
                name="referrer_name"
                required
                placeholder="誰介紹您來的？例：王小明"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
              />
              <p className="mt-1 text-xs text-zinc-500">沒有推薦人？請在備註欄留言，我們會回覆您</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">您與推薦人的關係</label>
              <select name="referrer_relation"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
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
              <label className="block text-sm font-medium text-zinc-700">您的聯絡電話</label>
              <input
                name="attendee_phone"
                type="tel"
                placeholder="0912-345-678"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
              />
              <p className="mt-1 text-xs text-zinc-500">活動當天臨時聯繫用，僅工作人員可見</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">想跟我們說的話（可空）</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="飲食偏好、特殊需求、或您最想在現場聽到的問題..."
                className="mt-1 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2"
              />
            </div>

            <button className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-white hover:bg-amber-700">
              ✅ 確認報名（免費）
            </button>
            <p className="text-center text-xs text-zinc-500">
              本平台為教學交流性質，所有內容不構成任何投資建議。
            </p>
          </form>
        </section>
      )}

      <section className="mt-8 rounded-xl bg-zinc-50 p-5">
        <h2 className="text-lg font-bold">這場活動為什麼跟別人不一樣</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-700">
          <li>🔮 <strong>不是報明牌、不是選股課</strong>——主持人不告訴您要買什麼</li>
          <li>👥 <strong>每個人都是貢獻者</strong>——您腦中的觀察就是現場的原料</li>
          <li>🤖 <strong>背後 15 個 AI 機器人輔助</strong>——把零碎觀察整合成排行榜，您不用懂 AI</li>
          <li>📲 <strong>全程一鍵操作</strong>——手機打字送出觀察，剩下交給系統</li>
          <li>🎯 <strong>共同發現轉弱訊號</strong>——不是預測，是群體智慧的即時呈現</li>
        </ul>
      </section>
    </main>
  )
}
