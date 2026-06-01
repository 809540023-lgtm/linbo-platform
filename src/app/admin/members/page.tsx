export const dynamic = 'force-dynamic'

// 會員審核：admin 看待審核 + 已核可清單，可一鍵核可/拒絕/停權
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminMembersPage({
  searchParams,
}: { searchParams: { filter?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase.from('profiles')
    .select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/pending')

  const filter = searchParams.filter || 'pending'

  // 用 admin client 列出所有 auth.users + profiles
  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('account_status', filter)
    .order('created_at', { ascending: false })
    .limit(100)

  // 抓對應的 emails（從 auth.users，需要 RPC 或關聯）
  // 簡化版：直接展示 profile 資料，emails 之後可加 RPC function

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-bold">會員審核</h1>

      <div className="mt-4 flex gap-2 text-sm">
        {[
          { v: 'pending', l: '待審核', c: 'amber' },
          { v: 'approved', l: '已核可', c: 'green' },
          { v: 'rejected', l: '已拒絕', c: 'red' },
          { v: 'suspended', l: '已停權', c: 'zinc' },
        ].map(f => (
          <a
            key={f.v}
            href={`/admin/members?filter=${f.v}`}
            className={`rounded-full px-4 py-1.5 ${filter === f.v
              ? 'bg-zinc-900 text-white'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
          >{f.l}</a>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2">暱稱</th>
              <th className="px-3 py-2">註冊時間</th>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {!members || members.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-zinc-500">沒有此類會員</td></tr>
            ) : members.map((m: any) => (
              <tr key={m.id} className="border-t border-zinc-100">
                <td className="px-3 py-3">{m.display_name || '—'}</td>
                <td className="px-3 py-3 text-xs text-zinc-500">
                  {new Date(m.created_at).toLocaleString('zh-TW')}
                </td>
                <td className="px-3 py-3">{m.account_status}</td>
                <td className="px-3 py-3 text-right">
                  {filter === 'pending' && (
                    <>
                      <form action="/api/members/approve" method="POST" className="inline">
                        <input type="hidden" name="user_id" value={m.id} />
                        <button className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">核可</button>
                      </form>
                      <form action="/api/members/reject" method="POST" className="ml-2 inline">
                        <input type="hidden" name="user_id" value={m.id} />
                        <button className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700">拒絕</button>
                      </form>
                    </>
                  )}
                  {filter === 'approved' && (
                    <form action="/api/members/suspend" method="POST" className="inline">
                      <input type="hidden" name="user_id" value={m.id} />
                      <button className="rounded-md bg-zinc-200 px-3 py-1 text-xs hover:bg-zinc-300">停權</button>
                    </form>
                  )}
                  {(filter === 'rejected' || filter === 'suspended') && (
                    <form action="/api/members/approve" method="POST" className="inline">
                      <input type="hidden" name="user_id" value={m.id} />
                      <button className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">恢復</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
