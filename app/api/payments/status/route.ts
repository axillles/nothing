import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getGatewayAdapter } from '@/lib/gateway'
import { applyGatewayEvent } from '@/lib/gateway/apply'

const querySchema = z.object({ paymentId: z.string().uuid() })

// The browser polls every few seconds; ask the gateway at most this often per payment.
const GATEWAY_POLL_MS = 10_000
const lastGatewayPoll = new Map<string, { at: number; providerStatus: string }>()

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const { paymentId } = querySchema.parse({ paymentId: url.searchParams.get('paymentId') })
    const { data: payment, error } = await getAdminSupabase().from('payments').select('*').eq('id', paymentId).single()
    if (error || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    let status = payment.status
    let providerStatus = lastGatewayPoll.get(payment.id)?.providerStatus ?? null

    // Fallback for a late or unreachable webhook: pull the gateway's view and apply it the same way.
    const polled = lastGatewayPoll.get(payment.id)
    if (payment.status === 'pending' && payment.provider_payment_id && (!polled || Date.now() - polled.at > GATEWAY_POLL_MS)) {
      lastGatewayPoll.set(payment.id, { at: Date.now(), providerStatus: providerStatus ?? 'waiting' })
      const event = await getGatewayAdapter().getStatus(payment.provider_payment_id)
      if (event) {
        const result = await applyGatewayEvent(payment, event)
        status = result.status
        providerStatus = result.providerStatus
        lastGatewayPoll.set(payment.id, { at: Date.now(), providerStatus })
      }
    }

    return NextResponse.json({ status, providerStatus, sequenceNumber: payment.sequence_number })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read payment status' }, { status: 400 })
  }
}
