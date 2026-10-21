import { NextResponse } from 'next/server'
import { getGatewayAdapter } from '@/lib/gateway'
import { applyGatewayEvent } from '@/lib/gateway/apply'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { enforceRateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const limit = await enforceRateLimit(`webhook:${clientIp(request)}`)
    if (!limit.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const event = await getGatewayAdapter().verifyWebhook(request)
    if (!event.providerPaymentId) return NextResponse.json({ error: 'Missing provider payment id' }, { status: 400 })

    const { data: payment, error } = await getAdminSupabase().from('payments').select('*').eq('provider_payment_id', event.providerPaymentId).single()
    if (error || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    const result = await applyGatewayEvent(payment, event)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook processing failed' }, { status: 400 })
  }
}
