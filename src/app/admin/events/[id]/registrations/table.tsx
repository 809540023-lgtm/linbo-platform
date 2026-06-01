'use client'
import { useMemo, useState, useTransition } from 'react'
import { togglePaidAction } from './actions'

type Row = {
  id: string
  user_id: string
  registered_at: string
  ticket_type: string
  price_quoted: number
  paid: boolean
  display_name: string
  email: string
  attendee_phone: string
  line_id: string
  referrer_name: string
  referrer_relation: string
  notes: string
}

export default function RegistrationsTable({
  eventId,
  eventTitle,
  rows: initialRows,
}: { eventId: string; eventTitle: string; rows: Row[] }) {
  const [rows, setRows] = useState(initialRows)
  const [filter, setFilter] = useState<'all' | 'onsite' | 'online' | 'unpaid' | 'paid'>('all')
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filter === 'onsite') return r.ticket_type === 'onsite'
      if (filter === 'online') return r.ticket_type === 'online'
      if (filter === 'paid') return r.paid
      if (filter === 'unpaid') return !r.paid
      return true
    })
  }, [rows, filter])

  const csv = useMemo(() => buildCsv(filtered), [filtered])

  function download() {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitize(eventTitle)}_報名名單_${todayStamp()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function togglePaid(regId: string, current: boolean) {
    setRows(prev => prev.map(r => r.id === regId ? { ...r, paid: !current } : r))
    startTransition(async () => {
      const res = await togglePaidAction(regId, !current)
      if (!res.ok) {
        // rollback
        setRows(prev => prev.map(r => r.id === regId ? { ...r, paid: current } : r))
        alert(`切換失敗：${res.error}`)
      }
    })
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FilterBtn cur={filter} val="all" onClick={setFilter}>全部 ({rows.length})</FilterBtn>
        <FilterBtn cur={filter} val="onsite" onClick={setFilter}>現場</FilterBtn>
        <FilterBtn cur={filter} val="online" onClick={setFilter}>線上</FilterBtn>
        <FilterBtn cur={filter} val="paid" onClick={setFilter}>已收款</FilterBtn>
        <FilterBtn cur={filter} val="unpaid" onClick={setFilter}>未收款</FilterBtn>
        <div className="ml-auto flex gap-2">
          <button
            onClick={download}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            ⬇ 下載 CSV ({filtered.length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2">時間</th>
              <th className="px-3 py-2">姓名</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">手機</th>
              <th className="px-3 py-2">LINE</th>
              <th className="px-3 py-2">票種</th>
              <th className="px-3 py-2 text-right">金額</th>
              <th className="px-3 py-2 text-center">已收款</th>
              <th className="px-3 py-2">推薦人</th>
              <th className="px-3 py-2">備註</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-10 text-center text-zinc-400">沒有符合條件的報名</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-t border-zinc-100">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">
                  {new Date(r.registered_at).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Taipei' })}
                </td>
                <td className="px-3 py-2 font-medium text-zinc-900">{r.display_name || '—'}</td>
                <td className="px-3 py-2 text-zinc-700">{r.email}</td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-700">{r.attendee_phone || '—'}</td>
                <td className="px-3 py-2 text-zinc-700">{r.line_id || '—'}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${r.ticket_type === 'onsite' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {r.ticket_type === 'onsite' ? '🪑 現場' : '💻 線上'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{r.price_quoted.toLocaleString()}</td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={r.paid}
                    onChange={() => togglePaid(r.id, r.paid)}
                    className="h-5 w-5 cursor-pointer accent-amber-600"
                    aria-label={`切換 ${r.display_name || r.email} 收款狀態`}
                  />
                </td>
                <td className="px-3 py-2 text-zinc-700">
                  {r.referrer_name}
                  {r.referrer_relation && <span className="text-zinc-400"> ({r.referrer_relation})</span>}
                </td>
                <td className="max-w-[200px] truncate px-3 py-2 text-xs text-zinc-500" title={r.notes}>
                  {r.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        勾選「已收款」會即時寫進資料庫。CSV 下載匯出目前篩選後的清單，含 BOM 適合 Excel 開。
      </p>
    </div>
  )
}

function FilterBtn({ cur, val, onClick, children }: any) {
  const active = cur === val
  return (
    <button
      onClick={() => onClick(val)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-amber-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
      }`}
    >
      {children}
    </button>
  )
}

function csvEscape(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function buildCsv(rows: Row[]): string {
  const header = ['報名時間', '姓名', 'Email', '手機', 'LINE ID', '票種', '金額', '已收款', '推薦人', '關係', '備註']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push([
      new Date(r.registered_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      r.display_name,
      r.email,
      r.attendee_phone,
      r.line_id,
      r.ticket_type === 'onsite' ? '現場' : '線上',
      r.price_quoted,
      r.paid ? '是' : '否',
      r.referrer_name,
      r.referrer_relation,
      r.notes,
    ].map(csvEscape).join(','))
  }
  return lines.join('\n')
}

function sanitize(s: string): string {
  return s.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 40)
}

function todayStamp(): string {
  const d = new Date()
  const tw = new Date(d.getTime() + (d.getTimezoneOffset() + 480) * 60_000)
  return `${tw.getFullYear()}${String(tw.getMonth() + 1).padStart(2, '0')}${String(tw.getDate()).padStart(2, '0')}`
}
