# NOTHING: environment setup

Copy `.env.example` to `.env.local` locally, and set the same variables in Vercel for production.

## Required

```env
NEXT_PUBLIC_APP_URL=https://your-domain   # used to build the NOWPayments callback URL
PAYMENT_MODE=live                         # mock = local demo without the gateway
MINIMUM_PAYMENT_USD=1

GATEWAY_PROVIDER=nowpayments
GATEWAY_API_KEY=...                       # NOWPayments → Settings → API keys
GATEWAY_WEBHOOK_SECRET=...                # NOWPayments → Settings → IPN secret
GATEWAY_API_URL=https://api.nowpayments.io

SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...                   # server-only
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

## NOWPayments dashboard

- **Payout wallets:** where your money lands. Check which coins have a wallet and whether auto-conversion is enabled. Coins without their own wallet are converted into a configured one, which costs an extra fee.
- **IPN secret:** must equal `GATEWAY_WEBHOOK_SECRET`.
- The IPN callback URL is sent per payment (`<NEXT_PUBLIC_APP_URL>/api/webhooks/gateway`). It is skipped automatically for `localhost`.

## Optional

- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: rate limiting. Leave empty locally. Set `FAIL_CLOSED_RATE_LIMIT=true` in production to reject requests during a Redis outage.
- `NFT_MINTING_ENABLED`, `NFT_AUTHORITY_PRIVATE_KEY`, `STORAGE_API_KEY`, `SOLANA_RPC_URL`, `CRON_SECRET`, `MINT_JOB_SECRET`: only for NFT receipts (off by default).
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_*`: error monitoring.

Never put `SUPABASE_SECRET_KEY`, gateway secrets or `NFT_AUTHORITY_PRIVATE_KEY` into `NEXT_PUBLIC_*` variables.
