import { getEnv } from '@/lib/env'
import { MockGatewayAdapter } from './mock'
import { NowPaymentsAdapter } from './nowpayments'
import type { GatewayAdapter } from './types'

export function getGatewayAdapter(): GatewayAdapter {
  return getEnv().PAYMENT_MODE === 'mock' ? new MockGatewayAdapter() : new NowPaymentsAdapter()
}
