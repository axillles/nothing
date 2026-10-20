import { getEnv } from '@/lib/env'
import { MockGatewayAdapter } from './mock'
import { NowPaymentsAdapter } from './nowpayments'
import { CoinbaseCommerceAdapter } from './coinbase'
import { BitPayAdapter } from './bitpay'
import type { GatewayAdapter } from './types'

export function getGatewayAdapter(): GatewayAdapter {
  const env = getEnv()
  if (env.PAYMENT_MODE === 'mock') return new MockGatewayAdapter()
  switch (env.GATEWAY_PROVIDER) {
    case 'coinbase': return new CoinbaseCommerceAdapter()
    case 'bitpay': return new BitPayAdapter()
    default: return new NowPaymentsAdapter()
  }
}
