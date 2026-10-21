'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'framer-motion'
import { CurrencyPicker } from './CurrencyPicker'
import { usePaymentLimits } from '@/hooks/usePaymentLimits'
import type { Currency } from '@/types/payment'

const PRESETS = [1, 5, 20, 69, 420, 1000, 10000]
const SLIDER_MAX = 1000
const SLIDER_DECADES = 4 // $1 … $10,000 on a log scale
const MAX_AMOUNT = 1_000_000

const MOODS = [
  { min: 0, tag: 'THE MISTAKE', line: 'Barely nothing. Still nothing.' },
  { min: 5, tag: 'CASUAL NOTHING', line: 'A coffee you will never drink.' },
  { min: 20, tag: 'COMMITTED', line: 'This is starting to feel intentional.' },
  { min: 69, tag: 'NICE', line: "Honestly, the most reasonable thing you've done today." },
  { min: 100, tag: 'SERIOUS NOTHING', line: 'Your bank may ask questions. Answer honestly.' },
  { min: 420, tag: 'DEGEN', line: "Please don't explain this to your accountant." },
  { min: 1000, tag: 'HIGH ROLLER', line: 'Four digits of absolutely nothing.' },
  { min: 10000, tag: 'WHALE', line: 'You could have bought something. You chose nothing. Respect.' },
]

function moodFor(amount: number) {
  return [...MOODS].reverse().find((mood) => amount >= mood.min) ?? MOODS[0]
}

function sliderToAmount(position: number) {
  const raw = 10 ** ((position / SLIDER_MAX) * SLIDER_DECADES)
  const step = raw >= 1000 ? 50 : raw >= 100 ? 5 : 1
  return Math.max(1, Math.round(raw / step) * step)
}

function amountToSlider(amount: number) {
  if (amount <= 1) return 0
  return Math.min(SLIDER_MAX, Math.round((Math.log10(amount) / SLIDER_DECADES) * SLIDER_MAX))
}

function format(amount: number) {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function NameYourPrice({ initialAmount = 69, onPay }: { initialAmount?: number; onPay: (amountUsd: number, currency: Currency) => void }) {
  const [currency, setCurrency] = useState<Currency>('SOL')
  const [amount, setAmount] = useState(initialAmount)
  const [text, setText] = useState(format(initialAmount))
  const [bump, setBump] = useState(0)
  const tween = useRef<ReturnType<typeof animate> | null>(null)
  const minimums = usePaymentLimits()
  const minimum = minimums[currency] ?? 1
  const belowMinimum = amount < minimum
  const mood = moodFor(amount)
  // Glow grows with the amount: a visual reward for paying more for nothing.
  const glow = Math.min(1, Math.log10(Math.max(amount, 1)) / SLIDER_DECADES)

  useEffect(() => () => tween.current?.stop(), [])

  // Programmatic changes (presets, slider) roll the number; typing sets it directly.
  function rollTo(next: number) {
    tween.current?.stop()
    const from = amount
    setAmount(next)
    setBump((value) => value + 1)
    tween.current = animate(from, next, {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setText(format(next % 1 === 0 ? Math.round(value) : value)),
      onComplete: () => setText(format(next)),
    })
  }

  function onType(value: string) {
    tween.current?.stop()
    const cleaned = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').replace(/^(\d*\.\d{0,2}).*$/, '$1')
    setText(cleaned)
    const parsed = Number(cleaned)
    setAmount(Number.isFinite(parsed) ? Math.min(parsed, MAX_AMOUNT) : 0)
  }

  return (
    <div className="relative overflow-hidden rounded-[4px] border border-[var(--line)] bg-[var(--card)] p-6 sm:p-9">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-56 w-[80%] rounded-full blur-3xl transition-opacity duration-700"
        style={{ background: 'radial-gradient(closest-side, rgba(201,162,39,0.55), transparent)', opacity: 0.15 + glow * 0.6 }}
      />

      <div className="relative text-center">
        <AnimatePresence mode="wait">
          <motion.div key={mood.tag} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.9 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }} className="inline-block rounded-full border border-[var(--purple)] px-3 py-1 font-mono text-[11px] tracking-[0.2em] text-[var(--purple)]">
            {mood.tag}
          </motion.div>
        </AnimatePresence>

        <motion.label key={bump} initial={{ scale: 1.04 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="mt-5 flex cursor-text items-baseline justify-center font-mono font-bold tracking-[-0.04em]" style={{ textShadow: `0 0 ${12 + glow * 36}px rgba(201,162,39,${0.15 + glow * 0.45})` }}>
          <span className="text-[clamp(32px,7vw,56px)] text-[var(--muted-gold)]">$</span>
          <input
            value={text}
            onChange={(event) => onType(event.target.value)}
            onBlur={() => setText(format(amount))}
            onFocus={(event) => event.target.select()}
            inputMode="decimal"
            aria-label="Amount in USD"
            className="w-full min-w-0 bg-transparent text-center text-[clamp(56px,14vw,112px)] leading-none text-[var(--gold)] outline-none"
            style={{ maxWidth: `${Math.max(2, text.length + 0.5)}ch` }}
          />
        </motion.label>

        <AnimatePresence mode="wait">
          <motion.p key={mood.line} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mx-auto mt-3 min-h-[24px] max-w-md text-sm text-[#999]">
            {mood.line}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="relative mt-7">
        <input
          type="range"
          min={0}
          max={SLIDER_MAX}
          value={amountToSlider(amount)}
          onChange={(event) => rollTo(sliderToAmount(Number(event.target.value)))}
          aria-label="Amount slider"
          className="nothing-range w-full"
          style={{ ['--fill' as string]: `${(amountToSlider(amount) / SLIDER_MAX) * 100}%` }}
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-[#555]"><span>$1</span><span>$100</span><span>$10,000</span></div>
      </div>

      <div className="relative mt-5 flex flex-wrap justify-center gap-2">
        {PRESETS.map((preset) => (
          <motion.button
            key={preset}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => rollTo(preset)}
            className={`rounded-full border px-3.5 py-1.5 font-mono text-xs transition-colors ${amount === preset ? 'border-[var(--gold)] bg-[#16120a] text-[var(--gold)]' : 'border-[var(--line)] text-[#888] hover:border-[#333] hover:text-[var(--ivory)]'}`}
          >
            ${format(preset)}
          </motion.button>
        ))}
      </div>

      <div className="relative mt-7"><CurrencyPicker value={currency} onChange={setCurrency} /></div>

      <div className="relative mt-3 min-h-[20px] text-center font-mono text-[11px]">
        {belowMinimum
          ? <span className="text-[#e8a87c]">Minimum for {currency} is ${minimum}.</span>
          : <span className="text-[#555]">Any amount from ${minimum} in {currency}.</span>}
      </div>

      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        disabled={belowMinimum || amount <= 0}
        onClick={() => onPay(Math.round(amount * 100) / 100, currency)}
        className="relative mt-4 w-full rounded-[2px] bg-[var(--gold)] px-6 py-4 font-mono text-sm font-bold tracking-[0.06em] text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        PAY ${format(amount)} FOR NOTHING →
      </motion.button>
    </div>
  )
}
