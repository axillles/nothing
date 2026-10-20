# Implementation notes

This repository follows the uploaded technical specification and visual mockup. The public interface deliberately stays close to the supplied NOTHING.html direction, while the payment logic is moved to server-side routes.

## What is already implemented

- Next.js App Router + TypeScript + Tailwind CSS + Framer Motion.
- Landing / pay / receipt / leaderboard routes.
- SOL and USDC native Solana payment construction with a unique per-intent reference.
- Server-side Solana verification with finalized transaction lookup, recipient, currency/amount, reference and duplicate-signature checks.
- BTC / ETH / USDT gateway abstraction with NOWPayments, Coinbase Commerce and BitPay adapters plus a mock adapter.
- HMAC webhook verification, idempotency and amount/currency/status checks.
- Supabase schema for payments, payment events, NFT mints, config, leaderboard and leaderboard stats.
- Realtime-friendly browser hooks and polling fallback for the public counter.
- Receipt OG image route.
- NFT worker endpoint using Metaplex Umi and Pinata-style IPFS JSON upload.
- Upstash Redis rate limiting.
- Vercel Cron configuration for the mint job.
- Sentry bootstrap configuration.

## What still requires deployment-specific configuration

The uploaded specification intentionally leaves production credentials, treasury addresses, RPC provider and gateway secrets as environment configuration. Those values are not invented here.

Before mainnet launch, configure and test the selected gateway in its sandbox, provision the production Solana RPC, fund and verify the treasury token account for USDC, configure the separate NFT authority, and apply the Supabase migration. The gateway API shapes and webhook header/signature rules should also be validated against the exact provider account/API version selected for production.

## Install compatibility fix (2026-10-04)

The original archive referenced `@solana/pay@^0.2.8`, but that version is no longer published in the npm registry. The project now avoids that dependency entirely and implements the Solana Pay transfer request URL plus direct SOL/USDC transaction construction on top of `@solana/web3.js` and `@solana/spl-token`.

The QR flow still embeds the unique payment `reference`, while the backend remains the source of truth for verification.

## Solana payment tracking

There are two Solana payment entry points:

1. Connected wallet: the server prepares an unsigned transaction using the private RPC, the browser asks Phantom/Solflare to sign it, and the signed transaction is broadcast by the server.
2. QR/mobile: the Solana Pay URI contains a unique `reference`. The server polls that reference with `getSignaturesForAddress`, then runs the same recipient/amount/finality/reference/signature-reuse verification. `/api/payments/status` performs an on-demand scan; `/api/jobs/scan-solana` is the background safety net.

A public `NEXT_PUBLIC_SOLANA_RPC_URL` is no longer required by the browser. Configure a real private `SOLANA_RPC_URL` for the server (for example, a Helius endpoint with a valid API key). A literal placeholder such as `YOUR_HELIUS_API_KEY` will fail with an RPC authorization error.
