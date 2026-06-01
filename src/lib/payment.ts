// 匯款資訊（現場 / 線上 都要先匯款才算報名成功）
// 改這裡會同步更新：活動頁票價區 + 報名確認信 + 活動提醒信
export const PAYMENT_INFO = {
  bankName: '中國信託',
  bankCode: '822',
  accountNumber: '336531048506',
  accountName: '林吟芝',
  // 通用說明：所有票種都需先匯款
  policyNote: '報名後請於 3 日內完成匯款，並 LINE 通知後 5 碼 + 姓名，款項到帳才算正式報名成功',
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
