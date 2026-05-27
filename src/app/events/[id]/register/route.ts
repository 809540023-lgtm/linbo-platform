// 處理報名表單提交（含票種 + LINE ID）
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { origin } = new URL(req.url)
  if (!user) return NextResponse.redirect(`${origin}/auth/login?next=/events/${params.id}`, 303)

  const form = await req.formData()
  const ticket_type = String(form.get('ticket_type') || 'onsite').trim()
  const referrer_name = String(form.get('referrer_name') || '').trim()
  const referrer_relation = String(form.get('referrer_relation') || '').trim() || null
  const attendee_phone = String(form.get('attendee_phone') || '').trim() || null
  const line_id = String(form.get('line_id') || '').trim() || null
  const notes = String(form.get('notes') || '').trim() || null

  if (!referrer_name) {
    return NextResponse.redirect(`${origin}/events/${params.id}?error=missing_referrer`, 303)
  }
  if (!['onsite', 'online'].includes(ticket_type)) {
    return NextResponse.redirect(`${origin}/events/${params.id}?error=invalid_ticket`, 303)
  }

  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('max_attendees').eq('id', params.id).single()
  if (event?.max_attendees) {
    const { count } = await admin.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', params.id)
    if ((count || 0) >= event.max_attendees) {
      return NextResponse.redirect(`${origin}/events/${params.id}?error=full`, 303)
    }
  }

  let price_quoted = 600
  if (ticket_type === 'onsite') {
    const { count: onsiteN } = await admin.from('registrations')
      .select('*', { count: 'exact', head: true }).eq('event_id', params.id).eq('ticket_type', 'onsite')
    price_quoted = (onsiteN || 0) === 0 ? 1000 : Math.max(500, Math.min(1000, Math.round(20000 / Math.max((onsiteN || 0) + 1, 1))))
  }

  await admin.from('registrations').upsert({
    event_id: params.id,
    user_id: user.id,
    ticket_type,
    price_quoted,
    paid: false,
    referrer_name,
    referrer_relation,
    attendee_phone,
    line_id,
    notes,
  }, { onConflict: 'event_id,user_id' })

  return NextResponse.redirect(`${origin}/events/${params.id}?success=1`, 303)
}
