import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { getGatewayAdapter } from '@/lib/gateway'
import { CURRENCIES, type Currency } from '@/types/payment'

// Per-currency USD minimums so the UI can warn before an intent is created.
export async function GET() {
  const env = getEnv()
  const gateway = getGatewayAdapter()
  const entries = await Promise.all(CURRENCIES.map(async (currency) => {
    const provider = await gateway.minimumUsd(currency).catch(() => null)
    return [currency, Math.max(env.MINIMUM_PAYMENT_USD, provider ?? 0)] as const
  }))
  return NextResponse.json({ minimums: Object.fromEntries(entries) as Record<Currency, number> }, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600' },
  })
}
