import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getEnv } from '@/lib/env'
import { getUsdRate } from '@/lib/pricing/usdRate'
import { getGatewayAdapter } from '@/lib/gateway'
import { GATEWAY_CURRENCIES, payableAmount } from '@/lib/gateway/currencies'
import { enforceRateLimit, clientIp } from '@/lib/rate-limit'
import { CURRENCIES } from '@/types/payment'

const MAX_PAYMENT_USD = 1_000_000

const schema = z.object({
  currency: z.enum(CURRENCIES),
  amountUsd: z.number().finite().positive().max(MAX_PAYMENT_USD).transform((value) => Math.round(value * 100) / 100),
  // Optional name for the wall; the gateway does not reveal the payer's wallet.
  displayName: z.string().trim().max(24).regex(/^[\p{L}\p{N} _.\-@$]*$/u, 'Name may contain letters, digits, spaces and _ . - @ $').optional(),
})

export async function POST(request: Request) {
  try {
    const limit = await enforceRateLimit(`create:${clientIp(request)}`)
    if (!limit.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = schema.parse(await request.json())
    const env = getEnv()
    const gateway = getGatewayAdapter()

    const providerMinimum = await gateway.minimumUsd(body.currency)
    const minimum = Math.max(env.MINIMUM_PAYMENT_USD, providerMinimum ?? 0)
    if (body.amountUsd < minimum) return NextResponse.json({ error: `Minimum for ${body.currency} is $${minimum}` }, { status: 400 })

    const config = GATEWAY_CURRENCIES[body.currency]
    const supabase = getAdminSupabase()
    const { data: payment, error } = await supabase.from('payments').insert({
      chain: config.chain,
      currency: body.currency,
      provider: env.PAYMENT_MODE === 'mock' ? 'mock' : 'nowpayments',
      amount_usd: body.amountUsd,
      usd_rate: await getUsdRate(body.currency),
      price_timestamp: new Date().toISOString(),
      payer_address: body.displayName || null,
      status: 'created',
    }).select('*').single()
    if (error || !payment) throw error ?? new Error('Could not create payment')

    const gatewayPayment = await gateway.createPayment({
      paymentId: payment.id,
      sequenceNumber: payment.sequence_number,
      amountUsd: body.amountUsd,
      currency: body.currency,
      callbackUrl: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/gateway`,
    }).catch(async (err) => {
      await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id)
      throw err
    })
    const { error: updateError } = await supabase.from('payments').update({
      provider_payment_id: gatewayPayment.providerPaymentId,
      amount_crypto: gatewayPayment.amountCrypto,
      status: 'pending',
    }).eq('id', payment.id)
    if (updateError) throw updateError

    const amountCrypto = payableAmount(body.currency, gatewayPayment.amountCrypto)
    return NextResponse.json({
      id: payment.id,
      sequenceNumber: payment.sequence_number,
      currency: body.currency,
      network: config.network,
      amountUsd: body.amountUsd,
      amountCrypto,
      paymentAddress: gatewayPayment.paymentAddress,
      walletUri: config.walletUri(gatewayPayment.paymentAddress, amountCrypto),
      expiresAt: gatewayPayment.expiresAt,
    }, { status: 201 })
  } catch (error) {
    console.error(error)
    const message = error instanceof z.ZodError ? error.issues[0]?.message ?? 'Invalid request' : error instanceof Error ? error.message : 'Payment creation failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
