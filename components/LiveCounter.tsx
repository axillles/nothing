'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'framer-motion'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useRouter } from 'next/navigation'

const emptyTicker = ['AWAITING FIRST VERIFIED PAYMENT', 'SOURCE OF TRUTH: THE GATEWAY', 'NOTHING IS DISPLAYED BEFORE VERIFICATION']

function money(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function LiveCounter() {
  const router = useRouter()
  const { data, loading } = useLeaderboard()
  const [display, setDisplay] = useState(data.totalUsd)
  const [flash, setFlash] = useState<{ id: number; amount: number } | null>(null)
  const previous = useRef<number | null>(null)

  // First load jumps straight to the total; later increases roll up and flash.
  useEffect(() => {
    if (loading) return
    const from = previous.current
    previous.current = data.totalUsd
    if (from === null || data.totalUsd <= from) {
      setDisplay(data.totalUsd)
      return
    }
    setFlash({ id: Date.now(), amount: data.totalUsd - from })
    const controls = animate(from, data.totalUsd, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: setDisplay })
    return () => controls.stop()
  }, [data.totalUsd, loading])

  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(() => setFlash(null), 3200)
    return () => window.clearTimeout(timer)
  }, [flash])

  const ticker = data.entries.length
    ? data.entries.slice(0, 8).map((e) => `${e.payerAddress ?? 'anonymous'} · $${e.amountUsd.toFixed(0)} verified`)
    : emptyTicker

  return (
    <div className="relative mt-14 overflow-hidden rounded-[4px] border border-[var(--line)] bg-[#050505]/80 text-center backdrop-blur-sm">
      {flash && <span key={flash.id} aria-hidden className="live-flash pointer-events-none absolute inset-0 rounded-[4px]" />}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
        <AnimatePresence>
          {flash && (
            <motion.div
              key={flash.id}
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="rounded-full border border-[var(--green)] bg-[#03140a] px-3 py-1 font-mono text-[11px] text-[var(--green)]"
            >
              +${money(flash.amount)} JUST PAID FOR NOTHING
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="px-7 pb-7 pt-12 sm:px-9 sm:pb-9 sm:pt-12">
        <div className="font-mono text-[12px] tracking-[0.2em] text-[var(--green)]">● LIVE</div>
        <motion.div animate={flash ? { scale: [1, 1.06, 1] } : {}} transition={{ duration: 0.6 }} className="mt-3 font-mono text-[clamp(38px,9vw,66px)] font-bold tracking-[-0.03em] text-[var(--green)]" style={{ textShadow: flash ? '0 0 32px rgba(0,255,102,0.45)' : undefined }}>
          ${money(display)}
        </motion.div>
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
