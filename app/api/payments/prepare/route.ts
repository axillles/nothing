import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PublicKey } from '@solana/web3.js'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getSolanaConnection } from '@/lib/solana/connection'
import { buildSolanaPaymentTransaction } from '@/lib/solana/pay'
import { getEnv } from '@/lib/env'

const schema = z.object({
  paymentId: z.string().uuid(),
  payerAddress: z.string().min(32).max(50),
})

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json())
    const env = getEnv()
    const supabase = getAdminSupabase()
    const { data: payment, error } = await supabase.from('payments').select('*').eq('id', body.paymentId).single()
    if (error || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.chain !== 'solana') return NextResponse.json({ error: 'Only Solana payments can be prepared here' }, { status: 400 })
    if (!payment.reference) return NextResponse.json({ error: 'Payment reference missing' }, { status: 400 })
    if (!payment.amount_crypto) return NextResponse.json({ error: 'Payment amount missing' }, { status: 400 })
    if (payment.status === 'verified' || payment.status === 'minted') {
      return NextResponse.json({ status: payment.status, transactionSignature: payment.transaction_signature })
    }

    const payer = new PublicKey(body.payerAddress)
    const treasury = new PublicKey(env.NEXT_PUBLIC_TREASURY_ADDRESS)
    const reference = new PublicKey(payment.reference)
    const transaction = buildSolanaPaymentTransaction({
      payer,
      treasury,
      reference,
      amountCrypto: payment.amount_crypto,
      currency: payment.currency as 'SOL' | 'USDC',
      usdcMint: payment.currency === 'USDC' ? new PublicKey(env.NEXT_PUBLIC_USDC_MINT) : undefined,
    })
    transaction.feePayer = payer
    const latest = await getSolanaConnection().getLatestBlockhash('confirmed')
    transaction.recentBlockhash = latest.blockhash
    transaction.lastValidBlockHeight = latest.lastValidBlockHeight

    const unsignedTransaction = transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')
    return NextResponse.json({ unsignedTransaction, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not prepare transaction' }, { status: 400 })
  }
}
