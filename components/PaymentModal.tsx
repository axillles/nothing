'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { CurrencyPicker } from './CurrencyPicker'
import { usePaymentLimits } from '@/hooks/usePaymentLimits'
import type { Currency, PaymentIntent } from '@/types/payment'

type Phase = 'setup' | 'creating' | 'awaiting' | 'verified' | 'expired'

export function PaymentModal({ amountUsd, initialCurrency = 'SOL', onClose }: { amountUsd: number; initialCurrency?: Currency; onClose: () => void }) {
  const [currency, setCurrency] = useState<Currency>(initialCurrency)
  const [displayName, setDisplayName] = useState('')
  const [intent, setIntent] = useState<PaymentIntent | null>(null)
  const [phase, setPhase] = useState<Phase>('setup')
  const [providerStatus, setProviderStatus] = useState<string | null>(null)
  const [error, setError] = useState('')
  const minimums = usePaymentLimits()
  const minimum = minimums[currency]
  const belowMinimum = minimum !== undefined && amountUsd < minimum

  async function createIntent() {
    setPhase('creating'); setError('')
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency, amountUsd, displayName: displayName.trim() || undefined }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not create payment')
      setIntent(data)
      setPhase('awaiting')
    } catch (err) {
      setPhase('setup'); setError(err instanceof Error ? err.message : 'Could not create payment')
    }
  }

  function startOver() {
    setIntent(null); setPhase('setup'); setProviderStatus(null); setError('')
  }

  // The server confirms via the gateway (signed webhook, or a status pull as fallback); this only reads the verdict.
  useEffect(() => {
    if (!intent || phase !== 'awaiting') return
    let cancelled = false
    const check = async () => {
      try {
        const response = await fetch(`/api/payments/status?paymentId=${encodeURIComponent(intent.id)}`, { cache: 'no-store' })
        const data = await response.json()
        if (cancelled || !response.ok) return
        setProviderStatus(data.providerStatus ?? null)
        if (data.status === 'verified' || data.status === 'minted') setPhase('verified')
        else if (data.status === 'expired' || data.status === 'failed') setPhase('expired')
      } catch {
        // Temporary network failure: the next poll retries automatically.
      }
    }
    check()
    const timer = window.setInterval(check, 4000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [intent, phase])

  if (phase === 'verified' && intent) {
    return <Overlay onClose={onClose}><Success intent={intent} onClose={onClose} /></Overlay>
  }

  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-xl rounded-[4px] border border-[var(--line)] bg-[#0a0a0a] p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] tracking-[0.24em] text-[var(--gold)]">NOTHING PAYMENT</div>
            <h2 className="mt-2 font-serif text-3xl">${amountUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })} for nothing</h2>
            <div className="mt-1 font-mono text-xs text-[#666]">no utility included</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-[#555] hover:text-[var(--ivory)]">×</button>
        </div>

        {!intent ? (
          <div className="mt-7 space-y-5">
            <CurrencyPicker value={currency} onChange={setCurrency} />
            <label className="block">
              <span className="font-mono text-[11px] tracking-[0.14em] text-[#666]">NAME ON THE WALL · OPTIONAL</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value.slice(0, 24))} placeholder="anonymous" className="mt-2 w-full rounded-[2px] border border-[var(--line)] bg-[#050505] px-3 py-3 font-mono text-sm outline-none placeholder:text-[#444] focus:border-[var(--gold)]" />
            </label>
            {belowMinimum && <div className="font-mono text-xs text-[#e8a87c]">Minimum for {currency} is ${minimum}. Pick another currency or a bigger nothing.</div>}
            <button onClick={createIntent} disabled={phase === 'creating' || belowMinimum} className="w-full rounded-[2px] bg-[var(--gold)] px-6 py-3.5 font-mono text-sm font-bold text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-40">
              {phase === 'creating' ? 'PREPARING ADDRESS…' : `CONTINUE WITH ${currency}`}
            </button>
          </div>
        ) : phase === 'expired' ? (
          <div className="mt-7 space-y-4 text-center">
            <div className="font-mono text-sm text-[#e8a87c]">This payment window has closed. If you already sent funds, they are still tracked by the gateway.</div>
            <button onClick={startOver} className="rounded-[2px] border border-[var(--gold)] px-5 py-3 font-mono text-xs text-[var(--gold)]">START A NEW PAYMENT</button>
          </div>
        ) : (
          <PaymentDetails intent={intent} providerStatus={providerStatus} />
        )}

        {error && <div className="mt-5 rounded-[2px] border border-[#402424] bg-[#130909] p-3 font-mono text-xs text-[#eaa]">{error}</div>}
      </div>
    </Overlay>
  )
}

function PaymentDetails({ intent, providerStatus }: { intent: PaymentIntent; providerStatus: string | null }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 grid gap-5 sm:grid-cols-[200px_1fr]">
      <div className="mx-auto w-full max-w-[200px]">
        <div className="rounded-[3px] border border-[var(--line)] bg-white p-3">
          <QRCodeSVG value={intent.walletUri} size={176} style={{ width: '100%', height: 'auto' }} />
        </div>
        <a href={intent.walletUri} className="mt-3 block rounded-[2px] border border-[var(--gold)] py-2.5 text-center font-mono text-xs text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--bg)]">OPEN IN WALLET →</a>
      </div>
      <div className="min-w-0">
        <div className="font-mono text-xs text-[#666]">SEND EXACTLY</div>
        <CopyField value={intent.amountCrypto} display={`${intent.amountCrypto} ${intent.currency}`} large />
        <div className="mt-4 font-mono text-xs text-[#666]">TO THIS ADDRESS</div>
        <CopyField value={intent.paymentAddress} />
        <div className="mt-3 rounded-[2px] border border-[#2a2410] bg-[#110e05] px-3 py-2 font-mono text-[11px] leading-5 text-[#c9a227]">
          Network: {intent.network}. Sending on another network loses the funds.
        </div>
        <div className="mt-4"><StatusLine providerStatus={providerStatus} expiresAt={intent.expiresAt} /></div>
      </div>
    </motion.div>
  )
}

function StatusLine({ providerStatus, expiresAt }: { providerStatus: string | null; expiresAt?: string }) {
  const remaining = useCountdown(expiresAt)
  const detected = providerStatus === 'confirming' || providerStatus === 'confirmed' || providerStatus === 'sending'
  const partial = providerStatus === 'partially_paid'
  const text = partial
    ? 'PARTIAL PAYMENT RECEIVED · SEND THE REST'
    : detected ? 'PAYMENT DETECTED · CONFIRMING ON CHAIN…' : 'WAITING FOR PAYMENT…'
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 font-mono text-[11px] text-[#999]">
        <span className={`inline-block h-2 w-2 animate-pulse rounded-full ${partial ? 'bg-[#e8a87c]' : 'bg-[var(--green)]'}`} />
        {text}
      </div>
      {!detected && remaining && <div className="font-mono text-[10px] text-[#555]">Address reserved for {remaining}</div>}
      <div className="font-mono text-[10px] leading-4 text-[#555]">This page updates by itself. Bitcoin confirmations can take 10–30 minutes.</div>
    </div>
  )
}

function useCountdown(expiresAt?: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!expiresAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])
  if (!expiresAt) return null
  const ms = new Date(expiresAt).getTime() - now
  if (!Number.isFinite(ms) || ms <= 0) return null
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function CopyField({ value, display, large = false }: { value: string; display?: string; large?: boolean }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be blocked; the text stays selectable.
    }
  }
  return (
    <button type="button" onClick={copy} className={`mt-1 block w-full break-all rounded-[2px] border border-[var(--line)] bg-[#050505] p-3 text-left font-mono hover:border-[#333] ${large ? 'text-lg text-[var(--green)]' : 'text-xs text-[#aaa]'}`}>
      {display ?? value}
      <span className="mt-1 block text-[10px] tracking-[0.1em] text-[var(--gold)]">{copied ? 'COPIED ✓' : 'TAP TO COPY'}</span>
    </button>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/80 p-4 backdrop-blur-sm">{children}</div>
}

function Success({ intent, onClose }: { intent: PaymentIntent; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} className="w-full max-w-lg rounded-[4px] border border-[var(--line)] bg-[#0a0a0a] p-8 text-center">
        <div className="font-mono text-xs tracking-[0.2em] text-[var(--green)]">PAYMENT VERIFIED.</div>
        <h2 className="mt-3 font-serif text-4xl">You own exactly what you owned before.</h2>
        <p className="mt-4 font-mono text-sm text-[#888]">Receipt #{String(intent.sequenceNumber).padStart(5, '0')} · ${intent.amountUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })} in {intent.currency}</p>
        <div className="mt-7 flex justify-center gap-2">
          <Link href={`/receipt/${intent.id}`} className="rounded-[2px] bg-[var(--gold)] px-5 py-3 font-mono text-xs font-bold text-[var(--bg)]">VIEW RECEIPT</Link>
          <button onClick={onClose} className="rounded-[2px] border border-[var(--line)] px-5 py-3 font-mono text-xs text-[#aaa] hover:text-white">CLOSE</button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
