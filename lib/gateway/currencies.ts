import Big from 'big.js'
import type { Chain, Currency } from '@/types/payment'

// Solana mainnet SPL mints, used so wallets pre-fill stablecoin transfers from the QR.
const USDC_SOLANA_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const USDT_SOLANA_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'

interface CurrencyConfig {
  /** NOWPayments ticker (pay_currency). */
  ticker: string
  chain: Chain
  /** Human label for the network the payer must use. */
  network: string
  /** On-chain decimals; wallets reject amounts more precise than the token allows. */
  decimals: number
  /** Wallet deep link / QR payload with the address and amount pre-filled where wallets support it. */
  walletUri: (address: string, amount: string) => string
}

const solanaPay = (mint?: string) => (address: string, amount: string) =>
  `solana:${address}?amount=${amount}${mint ? `&spl-token=${mint}` : ''}`

export const GATEWAY_CURRENCIES: Record<Currency, CurrencyConfig> = {
  SOL: { ticker: 'sol', chain: 'solana', network: 'Solana', decimals: 9, walletUri: solanaPay() },
  USDC: { ticker: 'usdcsol', chain: 'solana', network: 'Solana (SPL)', decimals: 6, walletUri: solanaPay(USDC_SOLANA_MINT) },
  USDT: { ticker: 'usdtsol', chain: 'solana', network: 'Solana (SPL)', decimals: 6, walletUri: solanaPay(USDT_SOLANA_MINT) },
  BTC: { ticker: 'btc', chain: 'bitcoin', network: 'Bitcoin', decimals: 8, walletUri: (address, amount) => `bitcoin:${address}?amount=${amount}` },
  // EIP-681 amounts are in wei and unevenly supported; the plain address is the safest QR payload.
  ETH: { ticker: 'eth', chain: 'ethereum', network: 'Ethereum', decimals: 18, walletUri: (address) => `ethereum:${address}` },
}

export function currencyFromTicker(ticker: string): Currency | null {
  const normalized = ticker.toLowerCase()
  const match = (Object.keys(GATEWAY_CURRENCIES) as Currency[]).find((currency) => GATEWAY_CURRENCIES[currency].ticker === normalized)
  return match ?? null
}

/** Rounds a gateway quote up to what the token can represent, so the payer never sends less than asked. */
export function payableAmount(currency: Currency, amount: string) {
  return new Big(amount).round(GATEWAY_CURRENCIES[currency].decimals, Big.roundUp).toString()
}
