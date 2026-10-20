import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Transaction } from '@solana/web3.js'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getSolanaConnection } from '@/lib/solana/connection'

const schema = z.object({
  paymentId: z.string().uuid(),
  signedTransaction: z.string().min(20),
})

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json())
    const supabase = getAdminSupabase()
    const { data: payment, error } = await supabase.from('payments').select('*').eq('id', body.paymentId).single()
    if (error || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.chain !== 'solana') return NextResponse.json({ error: 'Only Solana payments can be broadcast here' }, { status: 400 })
    if (payment.status === 'verified' || payment.status === 'minted') {
      return NextResponse.json({ status: payment.status, signature: payment.transaction_signature })
    }

    const transaction = Transaction.from(Buffer.from(body.signedTransaction, 'base64'))
    const signature = await getSolanaConnection().sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    })

    await supabase.from('payments').update({ status: 'submitted' }).eq('id', body.paymentId).in('status', ['created', 'pending', 'submitted'])
    await supabase.from('payment_events').insert({
      payment_id: body.paymentId,
      event_type: 'submitted',
      payload: { signature, source: 'server_broadcast' },
    })

    return NextResponse.json({ signature })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Broadcast failed' }, { status: 400 })
  }
}
