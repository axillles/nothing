import Link from 'next/link'
import type { Payment } from '@/types/payment'

export function ReceiptCard({ payment }: { payment: Payment }) {
  return (
    <div className="rounded-[4px] border border-[var(--line)] bg-[var(--card)] p-6">
      <div className="font-mono text-[11px] tracking-[0.22em] text-[var(--gold)]">NOTHING / RECEIPT</div>
      <div className="mt-3 font-serif text-5xl">#{String(payment.sequence_number).padStart(5, '0')}</div>
      <div className="mt-2 font-mono text-xs text-[var(--green)]">PAYMENT VERIFIED.</div>
      <div className="mt-7 grid gap-4 text-sm sm:grid-cols-3">
        <Stat label="NETWORK" value={payment.chain.toUpperCase()} />
        <Stat label="CURRENCY" value={payment.currency} />
        <Stat label="USD" value={`$${payment.amount_usd.toFixed(2)}`} />
      </div>
      <div className="mt-7 flex flex-wrap gap-2">
        <a href={`/api/receipts/${payment.id}/image`} target="_blank" rel="noreferrer" className="rounded-[2px] border border-[var(--line)] px-4 py-3 font-mono text-xs text-[#aaa] hover:text-white">RECEIPT IMAGE</a>
        <Link href="/leaderboard" className="rounded-[2px] border border-[var(--line)] px-4 py-3 font-mono text-xs text-[#aaa] hover:text-white">LEADERBOARD →</Link>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="border-l border-[var(--line)] pl-3"><div className="font-mono text-[10px] tracking-[0.14em] text-[#555]">{label}</div><div className="mt-1 font-mono text-sm text-[#ddd]">{value}</div></div>
}
