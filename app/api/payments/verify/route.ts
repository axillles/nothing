import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { verifySolanaPayment } from '@/lib/solana/verify'
import { enforceRateLimit, clientIp } from '@/lib/rate-limit'
import { getEnv } from '@/lib/env'

const schema = z.object({ paymentId: z.string().uuid(), signature: z.string().min(20).max(128) })

export async function POST(request: Request) {
  try {
    const limit = await enforceRateLimit(`verify:${clientIp(request)}`)
    if (!limit.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    const body = schema.parse(await request.json())
    const supabase = getAdminSupabase()
    const { data: payment, error } = await supabase.from('payments').select('*').eq('id', body.paymentId).single()
    if (error || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.status === 'verified' || payment.status === 'minted') return NextResponse.json({ status: payment.status, sequenceNumber: payment.sequence_number })
    if (!['solana'].includes(payment.chain)) return NextResponse.json({ error: 'Only native Solana payments are verified here' }, { status: 400 })

    await supabase.from('payments').update({ transaction_signature: body.signature, status: 'submitted' }).eq('id', body.paymentId)
    const verified = await verifySolanaPayment({ ...payment, transaction_signature: body.signature })

    const confirmedAt = new Date().toISOString()
    const { error: updateError } = await supabase.from('payments').update({
      status: 'verified',
      amount_crypto: verified.observedAmount,
      payer_address: verified.payerAddress,
      confirmed_at: confirmedAt,
    }).eq('id', body.paymentId).neq('status', 'verified')
    if (updateError) throw updateError

    await supabase.from('payment_events').insert({ payment_id: body.paymentId, event_type: 'verified', payload: { signature: body.signature } })
    const env = getEnv()
    return NextResponse.json({ status: 'verified', receiptId: payment.id, sequenceNumber: payment.sequence_number, explorerUrl: `https://solscan.io/tx/${body.signature}${env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''}` })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Verification failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
