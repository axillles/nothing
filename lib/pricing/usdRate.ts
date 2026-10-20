import Big from 'big.js'
import { getEnv } from '@/lib/env'
import type { Currency } from '@/types/payment'

const ids: Partial<Record<Currency, string>> = {
  SOL: 'solana',
  USDC: 'usd-coin',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
}

export async function getUsdRate(currency: Currency): Promise<number> {
  if (currency === 'USDC' || currency === 'USDT') return 1
  const env = getEnv()
  const id = ids[currency]
  if (!id) throw new Error(`Unsupported pricing currency: ${currency}`)
  const url = `${env.COINGECKO_API_URL}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`
  const response = await fetch(url, { next: { revalidate: 15 } })
  if (!response.ok) throw new Error(`Pricing provider returned ${response.status}`)
  const data = await response.json() as Record<string, { usd?: number }>
  const rate = data[id]?.usd
  if (!rate || !Number.isFinite(rate) || rate <= 0) throw new Error('Invalid USD rate')
  return new Big(rate).toNumber()
}

export function cryptoFromUsd(amountUsd: number, usdRate: number, decimals: number) {
  return new Big(amountUsd).div(usdRate).round(decimals, Big.roundHalfUp).toFixed(decimals)
}

export function decimalsFor(currency: Currency) {
  return currency === 'BTC' ? 8 : currency === 'ETH' || currency === 'SOL' ? 9 : 6
}
