import { NextResponse } from 'next/server'
import { getGatewayAdapter } from '@/lib/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { enforceRateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const limit = await enforceRateLimit(`webhook:${clientIp(request)}`)
    if (!limit.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const gateway = getGatewayAdapter()
    const event = await gateway.verifyWebhook(request)
    if (!event.providerPaymentId) return NextResponse.json({ error: 'Missing provider payment id' }, { status: 400 })

    const supabase = getAdminSupabase()
    const { data: payment, error } = await supabase.from('payments').select('*').eq('provider_payment_id', event.providerPaymentId).single()
    if (error || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.status === 'verified' || payment.status === 'minted') return NextResponse.json({ ok: true, duplicate: true })
    if (payment.currency !== event.currency) return NextResponse.json({ error: 'Currency mismatch' }, { status: 400 })

    const expected = Number(payment.amount_crypto ?? 0)
    const received = Number(event.amountCrypto)
    const providerStatus = event.status.toLowerCase()
    const confirmed = ['confirmed', 'completed', 'finished', 'paid', 'confirmed_or_paid'].includes(providerStatus)
    if (!confirmed) return NextResponse.json({ ok: true, ignored: providerStatus })
    if (!Number.isFinite(received) || received < expected) return NextResponse.json({ error: 'Underpaid or invalid amount' }, { status: 400 })

    const { error: updateError } = await supabase.from('payments').update({
      status: 'verified',
      amount_crypto: String(received),
      payer_address: event.payerAddress ?? payment.payer_address,
      confirmed_at: new Date().toISOString(),
    }).eq('id', payment.id).neq('status', 'verified')
    if (updateError) throw updateError

    await supabase.from('payment_events').insert({ payment_id: payment.id, event_type: 'verified', payload: event.raw })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook processing failed' }, { status: 400 })
  }
}
