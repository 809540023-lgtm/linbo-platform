// 研究 Agent 後台：列出 15 個 agents、執行、看歷史結果
// dynamic 設定見 layout.tsx（client component 不能直接放 dynamic）
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Agent = {
  id: string
  name: string
  name_en: string
  tier: string
  domain: string
  model: string
}

const AGENTS_META: Agent[] = [
  { id: 'agent_01', name: 'CoWoS 先進封裝研究員', name_en: 'CoWoS', tier: 'research', domain: 'CoWoS', model: 'opus' },
  { id: 'agent_02', name: 'HBM 高頻寬記憶體研究員', name_en: 'HBM Memory', tier: 'research', domain: 'HBM', model: 'opus' },
  { id: 'agent_03', name: 'CPO 共封裝光學研究員', name_en: 'CPO Optics', tier: 'research', domain: 'CPO', model: 'opus' },
  { id: 'agent_04', name: '先進製程研究員', name_en: 'Advanced Process', tier: 'research', domain: 'Advanced_Process', model: 'opus' },
  { id: 'agent_05', name: '矽光子/面板級封裝研究員', name_en: 'SiPh + PLP', tier: 'research', domain: 'Silicon_Photonics_PLP', model: 'opus' },
  { id: 'agent_06', name: 'IC 設計研究員', name_en: 'IC Design', tier: 'research', domain: 'IC_Design', model: 'opus' },
  { id: 'agent_07', name: '低軌衛星研究員', name_en: 'LEO Satellite', tier: 'research', domain: 'LEO_Satellite', model: 'opus' },
  { id: 'agent_08', name: '軍工國防研究員', name_en: 'Defense', tier: 'research', domain: 'Defense', model: 'opus' },
  { id: 'agent_09', name: 'Cross-Check 反方驗證員', name_en: 'Cross-Check', tier: 'validation', domain: 'cross_check', model: 'opus' },
  { id: 'agent_10', name: 'Source 來源稽核員', name_en: 'Source Audit', tier: 'validation', domain: 'source_audit', model: 'opus' },
  { id: 'agent_11', name: 'Taxonomy 分類一致性員', name_en: 'Taxonomy', tier: 'validation', domain: 'taxonomy', model: 'opus' },
  { id: 'agent_12', name: 'Visual Layout 視覺佈局員', name_en: 'Visual Layout', tier: 'visualization', domain: 'visual', model: 'sonnet' },
  { id: 'agent_13', name: 'Narrative 科普文案員', name_en: 'Narrative', tier: 'visualization', domain: 'narrative', model: 'sonnet' },
  { id: 'agent_14', name: 'Loop Controller 循環控制員', name_en: 'Loop Controller', tier: 'integration', domain: 'controller', model: 'sonnet' },
  { id: 'agent_15', name: 'Content Updater 內容更新員', name_en: 'Content Updater', tier: 'integration', domain: 'updater', model: 'sonnet' },
]

const tierLabel: Record<string, string> = {
  research: '🔬 研究類',
  validation: '✓ 驗證類',
  visualization: '🎨 視覺化類',
  integration: '⚙️ 整合類',
}
const tierColor: Record<string, string> = {
  research: 'bg-blue-50 border-blue-200',
  validation: 'bg-amber-50 border-amber-200',
  visualization: 'bg-purple-50 border-purple-200',
  integration: 'bg-zinc-50 border-zinc-200',
}

export default function ResearchPage() {
  const supabase = createClient()
  const [runs, setRuns] = useState<any[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [userInput, setUserInput] = useState<Record<string, string>>({})
  const [output, setOutput] = useState<any>(null)

  useEffect(() => {
    supabase.from('agent_runs').select('*').order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setRuns(data || []))
  }, [output])

  async function run(agentId: string) {
    setBusy(agentId)
    setOutput(null)
    try {
      const r = await fetch('/api/research-agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, user_input: userInput[agentId] || '' }),
      })
      const data = await r.json()
      setOutput(data)
    } catch (e: any) {
      setOutput({ error: e.message })
    } finally {
      setBusy(null)
    }
  }

  const tiers: Array<keyof typeof tierLabel> = ['research', 'validation', 'visualization', 'integration']

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">🔬 半導體/AI 供應鏈研究 Agents</h1>
        <p className="mt-1 text-sm text-zinc-600">15 個專業研究 agent — Opus 跑研究/驗證、Sonnet 跑視覺化/整合</p>
      </header>

      {tiers.map(tier => (
        <section key={tier} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{tierLabel[tier]}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {AGENTS_META.filter(a => a.tier === tier).map(a => (
              <div key={a.id} className={`rounded-lg border p-4 ${tierColor[tier]}`}>
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="font-medium">{a.name}</h3>
                    <p className="text-xs text-zinc-500">{a.id} · {a.name_en} · {a.model}</p>
                  </div>
                </div>
                <input
                  type="text"
                  value={userInput[a.id] || ''}
                  onChange={e => setUserInput({ ...userInput, [a.id]: e.target.value })}
                  placeholder="額外提示（可空，例：聚焦 TSMC 2nm 製程）"
                  className="mt-3 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                />
                <button
                  onClick={() => run(a.id)}
                  disabled={busy === a.id}
                  className="mt-2 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {busy === a.id ? '執行中...（最多 60 秒）' : '▶ 執行此 Agent'}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {output && (
        <section className="my-8 rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold">📦 最新執行結果</h2>
          {output.error ? (
            <p className="mt-2 text-red-600">錯誤：{output.error}</p>
          ) : (
            <>
              <div className="mt-2 text-sm text-zinc-600">
                Agent：<strong>{output.agent}</strong> ·
                耗時 {output.duration_ms}ms ·
                平均 confidence：{output.confidence_avg ? Math.round(output.confidence_avg) : '—'}
              </div>
              <pre className="mt-3 max-h-96 overflow-auto rounded bg-zinc-50 p-3 text-xs">
                {JSON.stringify(output.output, null, 2)}
              </pre>
            </>
          )}
        </section>
      )}

      <section className="my-8">
        <h2 className="mb-3 text-lg font-semibold">📜 最近 30 次執行紀錄</h2>
        <table className="w-full overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2">時間</th>
              <th className="px-3 py-2">Agent</th>
              <th className="px-3 py-2">領域</th>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2 text-right">耗時</th>
              <th className="px-3 py-2 text-right">信心度</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">尚未有執行紀錄</td></tr>
            ) : runs.map(r => (
              <tr key={r.id} className="border-t border-zinc-100">
                <td className="px-3 py-2 text-xs text-zinc-500">{new Date(r.created_at).toLocaleString('zh-TW')}</td>
                <td className="px-3 py-2">{r.agent_name}</td>
                <td className="px-3 py-2 text-xs">{r.domain}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${
                    r.status === 'completed' ? 'bg-green-100 text-green-700' :
                    r.status === 'running' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>{r.status}</span>
                </td>
                <td className="px-3 py-2 text-right text-xs">{r.duration_ms ? r.duration_ms + 'ms' : '—'}</td>
                <td className="px-3 py-2 text-right">{r.confidence_avg ? Math.round(r.confidence_avg) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}
