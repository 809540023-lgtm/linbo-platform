// Email via Resend
// RESEND_API_KEY 沒設時，所有發信函式 graceful no-op（log 警告，不 throw）
// RESEND_FROM 預設用測試網域 onboarding@resend.dev（只能寄給帳號擁有者）
// production 請設成自己驗證過的 domain，例如 '林博活動 <notify@linbo.0915888927.com>'

import { Resend } from 'resend'
import { PAYMENT_INFO, paymentInfoHtml } from './payment'

const apiKey = process.env.RESEND_API_KEY
const fromAddress =
  process.env.RESEND_FROM || '林博活動 <onboarding@resend.dev>'

const resend = apiKey ? new Resend(apiKey) : null

type SendResult = { ok: boolean; id?: string; reason?: string }

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<SendResult> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY missing — skip send', { to, subject })
    return { ok: false, reason: 'no_api_key' }
  }
  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    })
    if (error) {
      console.error('[email] resend error:', error)
      return { ok: false, reason: error.message }
    }
    return { ok: true, id: data?.id }
  } catch (e: any) {
    console.error('[email] send exception:', e)
    return { ok: false, reason: e?.message || 'unknown' }
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Taipei',
  })
}

function fmtPrice(n: number): string {
  return `NT$ ${n.toLocaleString('zh-TW')}`
}

// 共用 HTML 殼（簡潔、適合老人家友善大字、行動裝置 OK）
function wrap(title: string, bodyHtml: string, ctaUrl?: string, ctaText?: string): string {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8f7f4;font-family:-apple-system,'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif;color:#27272a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="background:#d97706;padding:24px 28px;color:white;">
          <p style="margin:0;font-size:14px;opacity:0.9;">林博 AI 台股智慧座談會</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:bold;">${title}</p>
        </td></tr>
        <tr><td style="padding:28px;font-size:16px;line-height:1.7;">
          ${bodyHtml}
          ${ctaUrl && ctaText ? `
          <p style="margin:28px 0 0;text-align:center;">
            <a href="${ctaUrl}" style="display:inline-block;background:#d97706;color:white;font-size:18px;font-weight:bold;padding:14px 28px;border-radius:12px;text-decoration:none;">${ctaText}</a>
          </p>
          ` : ''}
        </td></tr>
        <tr><td style="padding:18px 28px;background:#fafaf9;border-top:1px solid #f0eee9;font-size:12px;color:#71717a;text-align:center;">
          這封信由林博活動系統自動寄出。若有任何問題，可直接回信。
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export type RegistrationConfirmInput = {
  toEmail: string
  toName?: string | null
  eventTitle: string
  eventStartAt: string
  eventLocation?: string | null
  ticketType: 'onsite' | 'online'
  priceQuoted: number
  referrerName: string
  lineId?: string | null
  attendeePhone?: string | null
  notes?: string | null
  eventUrl: string
}

export async function sendRegistrationConfirmation(
  input: RegistrationConfirmInput
): Promise<SendResult> {
  const dt = fmtDate(input.eventStartAt)
  const ticketLabel = input.ticketType === 'onsite' ? '🪑 現場票' : '💻 線上票'
  const name = input.toName || '您'

  const body = `
    <p style="margin:0 0 14px;font-size:18px;">${name}您好，</p>
    <p style="margin:0 0 18px;">您已成功報名 <strong>${input.eventTitle}</strong>，期待當天見！</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:12px;border:1px solid #fde68a;margin:0 0 20px;">
      <tr><td style="padding:18px;">
        <p style="margin:0 0 8px;font-size:14px;color:#92400e;font-weight:bold;">📋 您的報名資訊</p>
        <p style="margin:6px 0;font-size:16px;"><strong>活動：</strong>${input.eventTitle}</p>
        <p style="margin:6px 0;font-size:16px;"><strong>時間：</strong>${dt}</p>
        ${input.eventLocation ? `<p style="margin:6px 0;font-size:16px;"><strong>地點：</strong>${input.eventLocation}</p>` : ''}
        <p style="margin:6px 0;font-size:16px;"><strong>票種：</strong>${ticketLabel}</p>
        <p style="margin:6px 0;font-size:16px;"><strong>金額：</strong>${fmtPrice(input.priceQuoted)}</p>
        <p style="margin:6px 0;font-size:16px;"><strong>推薦人：</strong>${input.referrerName}</p>
        ${input.lineId ? `<p style="margin:6px 0;font-size:16px;"><strong>LINE ID：</strong>${input.lineId}</p>` : ''}
      </td></tr>
    </table>

    ${input.ticketType === 'online' ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:2px solid #d97706;margin:0 0 20px;">
      <tr><td style="padding:18px;">
        <p style="margin:0 0 8px;font-size:14px;color:#92400e;font-weight:bold;">💳 線上票匯款資訊</p>
        <p style="margin:0 0 10px;font-size:14px;color:#92400e;">${PAYMENT_INFO.onlineDeadlineNote}</p>
        ${paymentInfoHtml()}
        <p style="margin:12px 0 0;font-size:14px;color:#92400e;">📱 轉帳後請將後 5 碼 + 姓名 LINE 給林博確認</p>
      </td></tr>
    </table>
    ` : `
    <p style="margin:0 0 14px;"><strong>付款方式</strong>：${PAYMENT_INFO.onsiteNote}，<strong>不必預付</strong>。</p>
    `}

    <p style="margin:0 0 14px;">活動前 3 天我們會再寄一封提醒信。當天請帶手機，現場用手機打開活動頁參與互動。</p>
    <p style="margin:18px 0 0;font-size:14px;color:#71717a;">如需修改報名資訊或取消，請點下方連結回到活動頁。</p>
  `

  return sendEmail({
    to: input.toEmail,
    subject: `✅ 報名成功：${input.eventTitle}`,
    html: wrap('報名成功 ✅', body, input.eventUrl, '查看活動詳情'),
  })
}

export type ReminderInput = {
  toEmail: string
  toName?: string | null
  eventTitle: string
  eventStartAt: string
  eventLocation?: string | null
  ticketType: 'onsite' | 'online'
  daysUntil: number
  eventUrl: string
}

export async function sendEventReminder(input: ReminderInput): Promise<SendResult> {
  const dt = fmtDate(input.eventStartAt)
  const ticketLabel = input.ticketType === 'onsite' ? '🪑 現場票' : '💻 線上票'
  const name = input.toName || '您'
  const dayWord = input.daysUntil <= 1 ? '明天' : `${input.daysUntil} 天後`

  const body = `
    <p style="margin:0 0 14px;font-size:18px;">${name}您好，</p>
    <p style="margin:0 0 18px;">提醒您報名的活動 <strong>${dayWord}</strong> 就要開始了。</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:12px;border:1px solid #fde68a;margin:0 0 20px;">
      <tr><td style="padding:18px;">
        <p style="margin:0 0 8px;font-size:14px;color:#92400e;font-weight:bold;">📅 活動資訊</p>
        <p style="margin:6px 0;font-size:16px;"><strong>${input.eventTitle}</strong></p>
        <p style="margin:6px 0;font-size:16px;"><strong>時間：</strong>${dt}</p>
        ${input.eventLocation ? `<p style="margin:6px 0;font-size:16px;"><strong>地點：</strong>${input.eventLocation}</p>` : ''}
        <p style="margin:6px 0;font-size:16px;"><strong>您的票種：</strong>${ticketLabel}</p>
      </td></tr>
    </table>

    <p style="margin:0 0 14px;"><strong>當天請帶</strong>：手機（用來看直播 + 送觀察）、身份證明（現場票需要）。</p>

    ${input.ticketType === 'online' ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:2px solid #d97706;margin:14px 0 20px;">
      <tr><td style="padding:18px;">
        <p style="margin:0 0 8px;font-size:14px;color:#92400e;font-weight:bold;">💳 線上票匯款（尚未付款請盡快）</p>
        ${paymentInfoHtml()}
        <p style="margin:12px 0 0;font-size:14px;color:#92400e;">📱 轉帳後請將後 5 碼 + 姓名 LINE 給林博確認</p>
      </td></tr>
    </table>
    ` : `
    <p style="margin:0 0 14px;"><strong>付款</strong>：${PAYMENT_INFO.onsiteNote}，不必預付。</p>
    `}

    <p style="margin:18px 0 0;font-size:14px;color:#71717a;">若臨時無法出席，請點下方連結回活動頁或直接回信告知。</p>
  `

  return sendEmail({
    to: input.toEmail,
    subject: `⏰ ${dayWord}活動提醒：${input.eventTitle}`,
    html: wrap('活動提醒 ⏰', body, input.eventUrl, '查看活動詳情'),
  })
}
