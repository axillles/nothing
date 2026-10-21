import { ImageResponse } from '@vercel/og'
import { ReceiptShareCard, RECEIPT_HEIGHT, RECEIPT_WIDTH, type ReceiptCardData } from '@/components/ReceiptShareCard'
import type { ReceiptOptions } from './themes'
import type { Payment } from '@/types/payment'

export function receiptCardData(payment: Payment): ReceiptCardData {
  return {
    sequenceNumber: payment.sequence_number,
    amountUsd: Number(payment.amount_usd),
    currency: payment.currency,
    amountCrypto: payment.amount_crypto === null ? null : String(payment.amount_crypto),
    displayName: payment.payer_address,
    confirmedAt: payment.confirmed_at,
  }
}

export function siteLabel() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? '').host
  } catch {
    return 'nothing'
  }
}

export function receiptImage(payment: Payment, options: ReceiptOptions, origin: string) {
  return new ImageResponse(
    <ReceiptShareCard data={receiptCardData(payment)} options={options} artSrc={`${origin}/receipt-art/${options.theme.id}.svg`} site={siteLabel()} />,
    { width: RECEIPT_WIDTH, height: RECEIPT_HEIGHT },
  )
}
