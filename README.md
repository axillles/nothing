# NOTHING.

A Next.js site where people pay crypto for nothing and get a numbered receipt and a place on the wall.

## How payments work

All five currencies go through **NOWPayments**:

| Currency | NOWPayments ticker | Network |
|---|---|---|
| SOL | `sol` | Solana |
| USDC | `usdcsol` | Solana (SPL) |
| USDT | `usdtsol` | Solana (SPL) |
| BTC | `btc` | Bitcoin |
| ETH | `eth` | Ethereum |

1. `POST /api/payments/create` asks NOWPayments for a payment. Each payment gets its own deposit address.
2. The payment window shows a QR (with the amount pre-filled where wallets support it), an "Open in wallet" link, the exact amount and the address.
3. NOWPayments calls `POST /api/webhooks/gateway`, signed with HMAC-SHA512 (the IPN secret). The payment becomes `verified` only on `confirmed` / `sending` / `finished` with the full amount.
4. Fallback: while the window is open, `GET /api/payments/status` pulls the payment from the NOWPayments API every ~10 s and applies it the same way. This covers a late webhook and lets local development work without a public URL.

The browser never marks a payment as paid. Per-currency minimums come from NOWPayments (`GET /api/payments/limits`). For example, BTC is about $23.

**Where the money goes:** to the payout wallet(s) configured in the NOWPayments dashboard (Settings → Payment → Payout wallets), not to an address in this repo.

## Run locally

```bash
nvm use 24        # or: brew install node@24
npm install
npm run dev
```

Apply `supabase/migrations/0001_init.sql` to the Supabase project and fill `.env.local` (see `ENV-SETUP.md`).

- `PAYMENT_MODE=mock`: no gateway. Confirm a payment manually by POSTing `{ "providerPaymentId": "mock_<paymentId>", "currency": "SOL", "amountCrypto": "<amount>", "status": "finished" }` to `/api/webhooks/gateway`.
- `PAYMENT_MODE=live`: real NOWPayments. Locally the webhook cannot reach you, so status comes from the polling fallback.

Checks: `npm run typecheck`, `npm run lint`, `npm run build`.

## NFT receipts (off by default)

`/api/jobs/mint` and `lib/nft/` can mint a receipt NFT on Solana. This is disabled until `NFT_MINTING_ENABLED=true`, a funded `NFT_AUTHORITY_PRIVATE_KEY` and a Pinata `STORAGE_API_KEY` are configured. The cron entry was removed from `vercel.json`; add it back when enabling.
