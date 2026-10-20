# NOTHING — environment setup

For local Solana testing, configure a real treasury and a real RPC endpoint. The browser does not need a Solana RPC URL anymore; signing happens through Phantom/Solflare and the server broadcasts through `SOLANA_RPC_URL`.

Required local values:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_TREASURY_ADDRESS=<DEVNET_TREASURY_PUBLIC_KEY>
NEXT_PUBLIC_USDC_MINT=<DEVNET_USDC_MINT>
SOLANA_RPC_URL=<PRIVATE_DEVNET_RPC_URL>
SOLANA_COMMITMENT=confirmed
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SECRET_KEY=<server-only-secret-key>
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
FAIL_CLOSED_RATE_LIMIT=false

PAYMENT_MODE=live
MINIMUM_PAYMENT_USD=1
```

For mainnet, use a private RPC provider such as Helius/QuickNode/Syndica/etc. Solana's public RPC is rate-limited and can return 403, and Solana explicitly recommends private RPC for production payment flows.

Do not put `SOLANA_RPC_URL`, `SUPABASE_SECRET_KEY`, gateway secrets, or `NFT_AUTHORITY_PRIVATE_KEY` into `NEXT_PUBLIC_*`.

The fixed wallet flow no longer reads `NEXT_PUBLIC_SOLANA_RPC_URL`. You can remove that variable from `.env.local`.

## QR/mobile flow

After `POST /api/payments/create`, SOL/USDC intents receive a unique `reference`. The QR encodes a Solana Pay payment URL containing that reference. A phone wallet submits the payment; the server discovers transactions with `getSignaturesForAddress(reference)`, verifies amount/recipient/finality/reference/signature reuse, and marks the payment `verified`.

The browser polls `GET /api/payments/status?paymentId=...` while the payment screen is open. `/api/jobs/scan-solana` runs in the background so closing the page does not lose the payment.
