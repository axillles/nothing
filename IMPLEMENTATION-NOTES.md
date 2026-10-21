# Implementation notes

## Payment architecture (since 2026-10-20)

Every currency is paid through NOWPayments (`lib/gateway/`):

- `currencies.ts` maps each currency to its NOWPayments ticker, chain, decimals and wallet deep-link format.
- `nowpayments.ts` creates payments, verifies IPNs, pulls status and reads minimums (cached 10 min, +5% margin).
- `apply.ts` is the single place that moves a payment to `verified` / `expired` / `failed`. Both the signed webhook and the status-poll fallback go through it. It checks provider payment id, currency, provider status and amount (`actually_paid` ≥ 99.5% of the quote).
- `webhook-verify.ts` checks the HMAC-SHA512 signature over key-sorted JSON (NOWPayments IPN spec).
- `mock.ts` is a local stand-in (`PAYMENT_MODE=mock`).

Earlier versions verified SOL/USDC natively on Solana with a Solana Pay reference against a single treasury address. That was removed because a plain transfer to the treasury (for example from an exchange) could not be matched to an order. NOWPayments issues a unique address per payment instead.

The gateway does not reveal the payer's wallet. The optional "name on the wall" from the payment form is stored in `payments.payer_address` and drives the leaderboard.

## Known follow-ups

- Real-money end-to-end check: one small payment per currency after deploying (the webhook needs a public URL).
- `receipt_sequence` keeps counting from test payments. To start receipts at #00001, delete the test rows in `payments` first, then run `select setval('receipt_sequence', 1, false);`.
- NFT receipts: see README.
