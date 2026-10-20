import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { findAndVerifySolanaPayment } from '@/lib/solana/track'

const querySchema = z.object({ paymentId: z.string().uuid() })

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const { paymentId } = querySchema.parse({ paymentId: url.searchParams.get('paymentId') })
    const supabase = getAdminSupabase()
    const { data: payment, error } = await supabase.from('payments').select('*').eq('id', paymentId).single()
    if (error || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    if (payment.chain === 'solana' && ['created', 'pending', 'submitted', 'confirmed'].includes(payment.status)) {
      const result = await findAndVerifySolanaPayment(payment)
      return NextResponse.json({
        status: result.status,
        sequenceNumber: result.sequenceNumber,
        transactionSignature: result.transactionSignature,
        message: result.message,
      })
    }

    return NextResponse.json({
      status: payment.status,
      sequenceNumber: payment.sequence_number,
      transactionSignature: payment.transaction_signature,
      payerAddress: payment.payer_address,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read payment status' }, { status: 400 })
  }
}
