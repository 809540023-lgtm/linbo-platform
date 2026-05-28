# Render Cron 設定（手動）

⚠️ 之前嘗試在 `render.yaml` 加 `type: cron` 區塊後，Render 部署卡住，推測 blueprint cron 語法在這個帳號/方案下不被接受。先用 Dashboard 手動建立。

## 需要的 3 個 Cron Job

| 名稱 | 頻率（UTC） | 對應台灣時間 | 打的 URL |
|---|---|---|---|
| `cron-agent-a` | `0 * * * *` | 每小時整點 | `https://linbo.0915888927.com/api/agent-a` |
| `cron-agent-b` | `0 * * * *` | 每小時整點 | `https://linbo.0915888927.com/api/agent-b` |
| `cron-send-reminder` | `0 1 * * *` | 每天 09:00 | `https://linbo.0915888927.com/api/send-reminder` |

## 方法 A：Render Dashboard 建立 Cron Job 服務

1. 進 https://dashboard.render.com/ → **New +** → **Cron Job**
2. 選擇 **Public Git Repository** 或 **Existing Repository**（連到本 repo）
3. 設定如下：
   - **Name**：`cron-agent-a`（或 b / send-reminder）
   - **Region**：Singapore（跟 web 同 region）
   - **Branch**：`main`
   - **Runtime**：`Docker` → 選 `curlimages/curl:latest` 或自己寫 1 行 Dockerfile
   - 或更簡單：**Runtime**：`Node` → **Build Command**: `echo ok` → **Command**:
     ```sh
     curl -fsSL -H "Authorization: Bearer $CRON_SECRET" "$SITE_URL/api/agent-a"
     ```
   - **Schedule**：對照上表的 cron expression（UTC）
4. 在 **Environment** 加：
   - `CRON_SECRET`：跟 web service 同一個值（可用 `Link Environment Group` 共用）
   - `SITE_URL`：`https://linbo.0915888927.com`
5. 重複建 b 跟 send-reminder

## 方法 B：用外部排程器（最簡單，不用 Render Pro 多開 service）

到 https://cron-job.org（免費）建 3 個 Job：

- URL：上表對應 URL
- Method：GET
- Headers：`Authorization: Bearer <你的 CRON_SECRET>`
- Schedule：對照上表

CRON_SECRET 從 Render Dashboard → linbo-platform → Environment 抓。

## 驗證

```sh
# 手動觸發測試（從你本機，帶上 CRON_SECRET）
curl -i -H "Authorization: Bearer $CRON_SECRET" https://linbo.0915888927.com/api/agent-a
curl -i -H "Authorization: Bearer $CRON_SECRET" https://linbo.0915888927.com/api/send-reminder
```

200 表示成功；401 表示 secret 帶錯；404 表示路由還沒部署（檢查 Render build log）。
