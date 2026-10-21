import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SOLANA_NETWORK: z.enum(['mainnet-beta', 'devnet', 'testnet']).default('mainnet-beta'),
  SOLANA_RPC_URL: z.string().url().default('https://api.mainnet-beta.solana.com'),
  SOLANA_COMMITMENT: z.enum(['processed', 'confirmed', 'finalized']).default('confirmed'),
  MINIMUM_PAYMENT_USD: z.coerce.number().positive().default(1),
  GATEWAY_PROVIDER: z.enum(['nowpayments']).default('nowpayments'),
  GATEWAY_API_KEY: z.string().min(1).optional(),
  GATEWAY_WEBHOOK_SECRET: z.string().min(1).optional(),
  GATEWAY_API_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).default('REPLACE_ME'),
  SUPABASE_SECRET_KEY: z.string().min(1).default('REPLACE_ME'),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  PRICE_PROVIDER: z.enum(['coingecko']).default('coingecko'),
  COINGECKO_API_URL: z.string().url().default('https://api.coingecko.com/api/v3'),
  PAYMENT_MODE: z.enum(['live', 'mock']).default('live'),
  NFT_AUTHORITY_PRIVATE_KEY: z.string().min(1).optional(),
  STORAGE_API_URL: z.string().url().optional(),
  STORAGE_API_KEY: z.string().min(1).optional(),
  STORAGE_GATEWAY_URL: z.string().url().optional(),
  NFT_COLLECTION_ADDRESS: z.string().optional(),
})


function rejectPlaceholder(name: string, value: string | undefined) {
  if (!value) return
  const normalized = value.toLowerCase()
  if (normalized.includes('replace_me') || normalized.includes('your_') || normalized.includes('your-') || normalized.includes('yourproject') || normalized.includes('your_project')) {
    throw new Error(`${name} contains a placeholder value. Configure a real production value before using live payments.`)
  }
}

export function getEnv() {
  const parsed = envSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    SOLANA_COMMITMENT: process.env.SOLANA_COMMITMENT,
    MINIMUM_PAYMENT_USD: process.env.MINIMUM_PAYMENT_USD,
    GATEWAY_PROVIDER: process.env.GATEWAY_PROVIDER,
    GATEWAY_API_KEY: process.env.GATEWAY_API_KEY,
    GATEWAY_WEBHOOK_SECRET: process.env.GATEWAY_WEBHOOK_SECRET,
    GATEWAY_API_URL: process.env.GATEWAY_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    PRICE_PROVIDER: process.env.PRICE_PROVIDER,
    COINGECKO_API_URL: process.env.COINGECKO_API_URL,
    PAYMENT_MODE: process.env.PAYMENT_MODE,
    NFT_AUTHORITY_PRIVATE_KEY: process.env.NFT_AUTHORITY_PRIVATE_KEY,
    STORAGE_API_URL: process.env.STORAGE_API_URL,
    STORAGE_API_KEY: process.env.STORAGE_API_KEY,
    STORAGE_GATEWAY_URL: process.env.STORAGE_GATEWAY_URL,
    NFT_COLLECTION_ADDRESS: process.env.NFT_COLLECTION_ADDRESS,
  })

  rejectPlaceholder('SUPABASE_URL', parsed.SUPABASE_URL)
  rejectPlaceholder('SUPABASE_PUBLISHABLE_KEY', parsed.SUPABASE_PUBLISHABLE_KEY)
  rejectPlaceholder('SUPABASE_SECRET_KEY', parsed.SUPABASE_SECRET_KEY)
  if (parsed.PAYMENT_MODE === 'live') {
    rejectPlaceholder('GATEWAY_API_KEY', parsed.GATEWAY_API_KEY)
    rejectPlaceholder('GATEWAY_WEBHOOK_SECRET', parsed.GATEWAY_WEBHOOK_SECRET)
  }
  return parsed
}
