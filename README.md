# NOTHING.

A Next.js implementation of the provided NOTHING payment concept and technical specification.

The repository is intentionally split into a polished public UI and server-side payment verification layers. Client input never becomes a verified payment state: Solana payments are checked against the chain, while BTC/ETH/USDT are accepted only through a signed/validated gateway webhook.

## What is included

- Landing page matching the supplied visual direction: ivory serif headlines, dark grid-like surface, gold actions, green live state, purple tier labels.
- Five-currency picker: SOL, USDC, BTC, ETH, USDT.
- Solana native intent + QR payment + connected-wallet signing + server-side verification.
- QR/mobile payments are tracked server-side by the unique Solana Pay reference, so the payer does not need to connect a browser wallet or keep the desktop page open.
- Connected-wallet signing uses a server-prepared transaction and server-side broadcast, so the browser does not need direct RPC access.
- Gateway adapter interface with NOWPayments/Coinbase/BitPay-shaped configuration and a mock mode for local development.
- Supabase migrations for payments, events, NFT mints, app config and a leaderboard view.
- Realtime leaderboard + live total.
- Receipt page and OG receipt image endpoint.
- NFT worker endpoint with Metaplex Umi and pluggable IPFS metadata storage.
- Upstash Redis rate limiting hooks for create/verify/webhook endpoints.
- Vercel Cron entry point for the mint worker.
- Sentry bootstrap files.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Apply `supabase/migrations/0001_init.sql` to a fresh Supabase project, then set `.env.local` values.

For a visual demo without real blockchain credentials, set:

```env
PAYMENT_MODE=mock
```

Mock mode is deliberately separated from live mode and must not be used for production funds.

## Production checklist

1. Use a production Solana RPC provider and a dedicated treasury public key.
2. Keep `SUPABASE_SECRET_KEY`, gateway secrets and `NFT_AUTHORITY_PRIVATE_KEY` server-only.
3. Configure the gateway's signed webhook secret and verify provider status/amount/currency before `verified`.
4. Test Solana on devnet first, including Phantom/Solflare and USDC.
5. Use separate treasury and NFT mint authorities.
6. Configure Sentry, Vercel Analytics and database backups.

### Upstash / local development

Upstash is optional for local development. Do not copy the literal `YOUR-REDIS.upstash.io` placeholder into `.env.local`. Leave `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` empty locally. The API will run without Redis rate limiting.

For production, configure both values from an Upstash Redis database. You can also set `FAIL_CLOSED_RATE_LIMIT=true` so a Redis outage rejects requests instead of failing open.

## Local setup

Use Node.js 24 LTS. See `INSTALL-LOCAL.md` for the clean-install commands.
