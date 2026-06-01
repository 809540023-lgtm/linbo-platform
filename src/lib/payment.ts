// 匯款資訊（線上票 / 提前付款用）
// 改這裡會同步更新：活動頁票價區 + 報名確認信 + 活動提醒信
export const PAYMENT_INFO = {
  bankName: '中國信託',
  bankCode: '822',
  accountNumber: '336531048506',
  accountName: '林吟芝',
  // 現場票收款方式描述
  onsiteNote: '當天現場以現金或 LINE Pay 收取',
  // 線上票轉帳期限
  onlineDeadlineNote: '請於報名後 3 日內完成轉帳',
} as const

// 在 HTML email 用的簡單表格列
export function paymentInfoHtml(): string {
  const p = PAYMENT_INFO
  return `
    <p style="margin:6px 0;font-size:16px;"><strong>銀行：</strong>${p.bankName}（${p.bankCode}）</p>
    <p style="margin:6px 0;font-size:16px;"><strong>帳號：</strong><span style="font-family:monospace;letter-spacing:1px;">${p.accountNumber}</span></p>
    <p style="margin:6px 0;font-size:16px;"><strong>戶名：</strong>${p.accountName}</p>
  `
}
