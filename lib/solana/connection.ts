import { Connection } from '@solana/web3.js'
import { getEnv } from '@/lib/env'

let connection: Connection | undefined

export function getSolanaConnection() {
  if (!connection) {
    const env = getEnv()
    connection = new Connection(env.SOLANA_RPC_URL, { commitment: env.SOLANA_COMMITMENT })
  }
  return connection
}
