# 部署紀錄 DEPLOYMENT

給未來的自己與 AI 助手：這個 repo 的程式在哪、部署到哪、怎麼更新。

## 0915888927.com — 林博AI 指揮中心

- 原始碼：本 repo 根目錄的 `index.html`（單一 HTML 檔，內含全部 22 個專案的資料與監控卡片）
- 部署平台：Render Static Site，服務名稱 `linbo-ai-dashboard`（ID: srv-d6seup6uk2gs7387lffg）
- 自動部署：push 到 `main` 分支即自動觸發（Auto-Deploy: On Commit）
- 正式網域：https://0915888927.com（www 會轉址到主網域，DNS 經 Cloudflare 代理）
- 備用網址：https://linbo-ai-dashboard.onrender.com

## 如何更新網站

1. 直接編輯本 repo 的 `index.html`（專案清單在 script 內的 `projects` 陣列）
2. commit 到 `main`
3. Render 會自動重新部署，數分鐘內生效於 0915888927.com

## 其他

- 本 repo 同時包含「林博AI 台股座談會」Next.js 平台原始碼（`src/`），與指揮中心的 `index.html` 共用同一個 repo
- 最後確認日期：2026-07-07
