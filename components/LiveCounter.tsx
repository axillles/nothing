'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useRouter } from 'next/navigation'

const emptyTicker = ['AWAITING FIRST VERIFIED PAYMENT', 'SOURCE OF TRUTH: BLOCKCHAIN / GATEWAY', 'NOTHING IS DISPLAYED BEFORE VERIFICATION']

export function LiveCounter() {
  const router = useRouter()
  const { data } = useLeaderboard()
  const [display, setDisplay] = useState(data.totalUsd)
  useEffect(() => setDisplay(data.totalUsd), [data.totalUsd])

  const total = display.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const ticker = data.entries.length
    ? data.entries.slice(0, 8).map((e) => `${e.payerAddress ? `${e.payerAddress.slice(0, 5)}...${e.payerAddress.slice(-3)}` : 'anonymous'} · $${e.amountUsd.toFixed(0)} verified`)
    : emptyTicker

  return (
    <div className="mt-14 overflow-hidden rounded-[4px] border border-[var(--line)] bg-[#050505] text-center">
      <div className="p-7 sm:p-9">
        <div className="font-mono text-[12px] tracking-[0.2em] text-[var(--green)]">● LIVE</div>
        <motion.div key={total} initial={{ opacity: 0.75 }} animate={{ opacity: 1 }} className="mt-3 font-mono text-[clamp(38px,9vw,66px)] font-bold tracking-[-0.03em] text-[var(--green)]">${total}</motion.div>
        <div className="font-mono text-sm text-[#777]">RAISED FOR ABSOLUTELY NOTHING</div>
        <button onClick={() => router.push('/leaderboard')} className="mt-2 font-mono text-xs text-[#888] hover:text-[var(--ivory)]">{data.verifiedPayments} people have already made this mistake. → leaderboard</button>
      </div>
      <div className="border-y border-[var(--line)] py-3 font-mono text-xs text-[#6d6d6d]">
        <div className="flex min-w-max animate-[ticker_28s_linear_infinite] gap-12 px-5">
          {[...ticker, ...ticker].map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
        </div>
      </div>
      <style jsx>{`@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  )
}
