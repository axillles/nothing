import { PublicKey } from '@solana/web3.js'
import { getEnv } from '@/lib/env'

export const SOL_DECIMALS = 9
export const USDC_DECIMALS = 6

export function treasuryKey() {
  return new PublicKey(getEnv().NEXT_PUBLIC_TREASURY_ADDRESS)
}

export function usdcMintKey() {
  return new PublicKey(getEnv().NEXT_PUBLIC_USDC_MINT)
}
