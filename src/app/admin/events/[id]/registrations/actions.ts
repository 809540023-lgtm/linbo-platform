'use server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function togglePaidAction(
  registrationId: string,
  newPaid: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  // 確認當前使用者是 admin
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return { ok: false, error: 'not_admin' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('registrations')
    .update({ paid: newPaid })
    .eq('id', registrationId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
