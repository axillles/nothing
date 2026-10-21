import type { ReceiptOptions } from '@/lib/receipt/themes'

export const RECEIPT_WIDTH = 1200
export const RECEIPT_HEIGHT = 630

export interface ReceiptCardData {
  sequenceNumber: number
  amountUsd: number
  currency: string
  amountCrypto: string | null
  displayName: string | null
  confirmedAt: string | null
}

/**
 * The 1200×630 share card. Inline styles and flex-only layout so the same JSX
 * renders in the browser (preview + PNG download) and in @vercel/og (link previews).
 */
export function ReceiptShareCard({ data, options, artSrc, site, fontFamily }: {
  data: ReceiptCardData
  options: ReceiptOptions
  /** Absolute or same-origin URL of the art (or a user photo object URL). */
  artSrc: string
  site: string
  fontFamily?: string
}) {
  const { theme } = options
  const date = data.confirmedAt ? new Date(data.confirmedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null
  const usd = `$${data.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const crypto = data.amountCrypto ? `${Number(data.amountCrypto).toLocaleString('en-US', { maximumFractionDigits: 8 })} ${data.currency}` : data.currency

  return (
    <div style={{ width: RECEIPT_WIDTH, height: RECEIPT_HEIGHT, display: 'flex', position: 'relative', overflow: 'hidden', background: theme.base, color: theme.text, ...(fontFamily ? { fontFamily } : {}) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={artSrc} alt="" width={700} height={RECEIPT_HEIGHT} style={{ position: 'absolute', right: 0, top: 0, width: 700, height: RECEIPT_HEIGHT, objectFit: 'cover' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: RECEIPT_WIDTH, height: RECEIPT_HEIGHT, display: 'flex', backgroundImage: `linear-gradient(90deg, ${theme.base} 0%, ${theme.base} 40%, ${theme.base}00 72%)` }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: 640, height: RECEIPT_HEIGHT, padding: '64px 0 56px 72px' }}>
        <div style={{ display: 'flex', fontSize: 22, letterSpacing: 6, color: theme.accent }}>NOTHING™ / RECEIPT #{String(data.sequenceNumber).padStart(5, '0')}</div>
        <div style={{ display: 'flex', fontSize: 30, letterSpacing: 4, marginTop: 56, color: theme.muted }}>{options.caption}</div>
        <div style={{ display: 'flex', fontSize: 132, fontWeight: 700, letterSpacing: -4, lineHeight: 1, marginTop: 14, color: theme.accent }}>{usd}</div>
        {options.showCrypto && <div style={{ display: 'flex', fontSize: 30, marginTop: 18, color: theme.text }}>{crypto}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
          {options.showName && data.displayName && <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: theme.text }}>{data.displayName}</div>}
          <div style={{ display: 'flex', fontSize: 20, marginTop: 10, color: theme.muted }}>{[date, 'verified payment', site].filter(Boolean).join('  ·  ')}</div>
        </div>
      </div>
    </div>
  )
}
