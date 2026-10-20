import { ImageResponse } from '@vercel/og'
import type { Payment } from '@/types/payment'

export function receiptImage(payment: Payment) {
  return new ImageResponse(
    <div style={{
      width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
      background: '#080808', color: '#F5F1E8', padding: '70px', fontFamily: 'sans-serif',
      border: '1px solid #1c1c1c',
    }}>
      <div style={{ display: 'flex', fontSize: 24, letterSpacing: 5, color: '#C9A227' }}>NOTHING™ / RECEIPT</div>
      <div style={{ display: 'flex', fontSize: 84, marginTop: 34, fontWeight: 700 }}>#{String(payment.sequence_number).padStart(5, '0')}</div>
      <div style={{ display: 'flex', fontSize: 30, marginTop: 14, color: '#00FF66' }}>PAYMENT VERIFIED.</div>
      <div style={{ display: 'flex', fontSize: 24, marginTop: 54, color: '#999' }}>{payment.currency} · {payment.amount_crypto ?? '—'} · ${payment.amount_usd.toFixed(2)}</div>
      <div style={{ display: 'flex', fontSize: 20, marginTop: 'auto', color: '#666' }}>You now own exactly what you owned before.</div>
    </div>,
    { width: 1200, height: 630 },
  )
}
