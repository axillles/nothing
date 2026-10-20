import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Keypair } from '@solana/web3.js'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getEnv } from '@/lib/env'
import { getUsdRate, cryptoFromUsd, decimalsFor } from '@/lib/pricing/usdRate'
import { getGatewayAdapter } from '@/lib/gateway'
import { enforceRateLimit, clientIp } from '@/lib/rate-limit'
import type { Currency } from '@/types/payment'

const schema = z.object({
  currency: z.enum(['SOL', 'USDC', 'BTC', 'ETH', 'USDT']),
  amountUsd: z.number().finite().positive(),
})

export async function POST(request: Request) {
  try {
    const limit = await enforceRateLimit(`create:${clientIp(request)}`)
    if (!limit.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = schema.parse(await request.json())
    const env = getEnv()
    if (body.amountUsd < env.MINIMUM_PAYMENT_USD) return NextResponse.json({ error: `Minimum payment is $${env.MINIMUM_PAYMENT_USD}` }, { status: 400 })

    const chain = body.currency === 'SOL' || body.currency === 'USDC' ? 'solana' : body.currency === 'BTC' ? 'bitcoin' : 'ethereum'
    const provider = chain === 'solana' ? 'native' : env.GATEWAY_PROVIDER
    const rate = await getUsdRate(body.currency as Currency)
    const decimals = decimalsFor(body.currency as Currency)
    const expectedAmountCrypto = cryptoFromUsd(body.amountUsd, rate, decimals)
    const sequence = await reserveSequence()
    const reference = chain === 'solana' ? Keypair.generate().publicKey.toBase58() : null

    const { data: payment, error } = await getAdminSupabase().from('payments').insert({
      sequence_number: sequence,
      chain,
      currency: body.currency,
      provider,
      amount_usd: body.amountUsd,
      usd_rate: rate,
      price_timestamp: new Date().toISOString(),
      reference,
      amount_crypto: expectedAmountCrypto,
      status: 'created',
    }).select('*').single()
    if (error || !payment) throw error ?? new Error('Could not create payment')

    let response: Record<string, unknown> = {
      id: payment.id,
      sequenceNumber: sequence,
      chain,
      currency: body.currency,
      provider,
      amountUsd: body.amountUsd,
      expectedAmountCrypto,
      reference,
      treasuryAddress: env.NEXT_PUBLIC_TREASURY_ADDRESS,
      usdcMint: env.NEXT_PUBLIC_USDC_MINT,
    }

    if (chain === 'solana') {
      const { error: updateError } = await getAdminSupabase().from('payments').update({ status: 'pending' }).eq('id', payment.id)
      if (updateError) throw updateError
    } else {
      const gateway = getGatewayAdapter()
      const gatewayPayment = await gateway.createPayment({
        paymentId: payment.id,
        sequenceNumber: sequence,
        amountUsd: body.amountUsd,
        currency: body.currency as 'BTC' | 'ETH' | 'USDT',
        callbackUrl: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/gateway`,
      })
      const { error: updateError } = await getAdminSupabase().from('payments').update({
        provider_payment_id: gatewayPayment.providerPaymentId,
        amount_crypto: gatewayPayment.amountCrypto,
        status: 'pending',
      }).eq('id', payment.id)
      if (updateError) throw updateError
      response = {
        ...response,
        paymentAddress: gatewayPayment.paymentAddress,
        paymentUrl: gatewayPayment.paymentUrl,
        qrPayload: gatewayPayment.qrPayload,
        expiresAt: gatewayPayment.expiresAt,
        expectedAmountCrypto: gatewayPayment.amountCrypto,
      }
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Payment creation failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

async function reserveSequence() {
  const supabase = getAdminSupabase()
  const { data, error } = await supabase.rpc('reserve_receipt_sequence')
  if (error) throw error
  return Number(data)
}
