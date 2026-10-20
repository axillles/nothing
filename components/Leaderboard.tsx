'use client'

import { useLeaderboard } from '@/hooks/useLeaderboard'

function short(value: string | null) {
  if (!value) return 'anonymous'
  if (value.length < 12) return value
  return `${value.slice(0, 5)}...${value.slice(-4)}`
}

export function Leaderboard() {
  const { data, loading } = useLeaderboard()
  return (
    <div className="overflow-hidden rounded-[4px] border border-[var(--line)] bg-[var(--card)]">
      <div className="grid grid-cols-[48px_1fr_120px_80px] border-b border-[var(--line)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#555] sm:grid-cols-[58px_1fr_150px_100px]">
        <span>#</span><span>WALLET</span><span>USD</span><span>TX</span>
      </div>
      {loading && !data.entries.length && <div className="p-6 font-mono text-xs text-[#555]">LOADING NOTHING…</div>}
      {!loading && !data.entries.length && <div className="p-6 font-mono text-xs text-[#555]">No verified payments yet. Someone has to go first.</div>}
      {data.entries.map((entry) => (
        <div key={`${entry.rank}-${entry.payerAddress}`} className="grid grid-cols-[48px_1fr_120px_80px] items-center border-b border-[var(--line)] px-4 py-4 last:border-0 sm:grid-cols-[58px_1fr_150px_100px]">
          <span className="font-mono text-xs text-[var(--gold)]">{String(entry.rank).padStart(2, '0')}</span>
          <span className="font-mono text-xs text-[#999]">{short(entry.payerAddress)}</span>
          <span className="font-mono text-sm font-bold text-[var(--green)]">${entry.amountUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
          <span className="font-mono text-xs text-[#555]">{entry.paymentsCount}</span>
        </div>
      ))}
    </div>
  )
}
