'use client'

import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey, Transaction } from '@solana/web3.js'
import { buildSolanaPayUrl } from '@/lib/solana/pay'
import { QRCodeSVG } from 'qrcode.react'
import { CurrencyPicker } from './CurrencyPicker'
import type { Currency, PaymentIntent } from '@/types/payment'

export function PaymentModal({ amountUsd, onClose }: { amountUsd: number; onClose: () => void }) {
  const [currency, setCurrency] = useState<Currency>('SOL')
  const [intent, setIntent] = useState<PaymentIntent | null>(null)
  const [status, setStatus] = useState<'idle' | 'creating' | 'signing' | 'verifying' | 'verified' | 'error'>('idle')
  const [error, setError] = useState('')
  const [signature, setSignature] = useState('')
  const [qrMode, setQrMode] = useState(true)
  const wallet = useWallet()

  const isSolana = currency === 'SOL' || currency === 'USDC'
  const modalTitle = useMemo(() => isSolana ? 'PAY WITH WALLET' : 'PAY VIA GATEWAY', [isSolana])

  useEffect(() => { setIntent(null); setSignature(''); setStatus('idle'); setError('') }, [currency])

  async function createIntent() {
    setStatus('creating'); setError('')
    try {
      const response = await fetch('/api/payments/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currency, amountUsd }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not create payment intent')
      setIntent(data)
      setStatus('idle')
    } catch (err) {
      setStatus('error'); setError(err instanceof Error ? err.message : 'Payment intent failed')
    }
  }

  async function paySolana() {
    if (!wallet.publicKey || !wallet.signTransaction || !intent) return
    setStatus('signing'); setError('')
    try {
      const prepared = await fetch('/api/payments/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: intent.id, payerAddress: wallet.publicKey.toBase58() }),
      })
      const preparedData = await prepared.json()
      if (!prepared.ok) throw new Error(preparedData.error || 'Could not prepare transaction')

      const tx = Transaction.from(base64ToBytes(preparedData.unsignedTransaction))
      const signed = await wallet.signTransaction(tx)
      const signedTransaction = bytesToBase64(signed.serialize())
      const broadcast = await fetch('/api/payments/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: intent.id, signedTransaction }),
      })
      const broadcastData = await broadcast.json()
      if (!broadcast.ok) throw new Error(broadcastData.error || 'Broadcast failed')
      setSignature(broadcastData.signature || '')
      setStatus('verifying')
      await pollPaymentStatus(intent.id)
    } catch (err) {
      setStatus('error'); setError(err instanceof Error ? err.message : 'Wallet payment failed')
    }
  }

  async function pollPaymentStatus(paymentId: string) {
    for (let attempt = 0; attempt < 45; attempt += 1) {
      const response = await fetch(`/api/payments/status?paymentId=${encodeURIComponent(paymentId)}`, { cache: 'no-store' })
      const data = await response.json()
      if (response.ok && (data.status === 'verified' || data.status === 'minted')) {
        setSignature(data.transactionSignature || signature)
        setStatus('verified')
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    setStatus('idle')
    setError('Payment was sent, but final confirmation is taking longer than usual. Keep this window open; the server will continue monitoring the reference.')
  }

  useEffect(() => {
    if (!intent || !isSolana) return
    let cancelled = false
    const check = async () => {
      try {
        const response = await fetch(`/api/payments/status?paymentId=${encodeURIComponent(intent.id)}`, { cache: 'no-store' })
        const data = await response.json()
        if (!cancelled && response.ok && (data.status === 'verified' || data.status === 'minted')) {
          setSignature(data.transactionSignature || '')
          setStatus('verified')
        }
      } catch {
        // Temporary RPC/network failure: the next poll retries automatically.
      }
    }
    check()
    const timer = window.setInterval(check, 3000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [intent, isSolana])

  if (status === 'verified') {
    return <Overlay><Success sequence={intent?.sequenceNumber} signature={signature} onClose={onClose} /></Overlay>
  }

  return (
    <Overlay>
      <div className="w-full max-w-xl rounded-[4px] border border-[var(--line)] bg-[#0a0a0a] p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] tracking-[0.24em] text-[var(--gold)]">NOTHING PAYMENT</div>
            <h2 className="mt-2 font-serif text-3xl">{modalTitle}</h2>
            <div className="mt-1 font-mono text-xs text-[#666]">${amountUsd.toFixed(2)} USD · no utility included</div>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-[#555] hover:text-[var(--ivory)]">×</button>
        </div>

        <div className="mt-7"><CurrencyPicker value={currency} onChange={setCurrency} /></div>

        {!intent ? (
          <button onClick={createIntent} disabled={status === 'creating'} className="mt-6 w-full rounded-[2px] bg-[var(--gold)] px-6 py-3.5 font-mono text-sm font-bold text-[var(--bg)] disabled:cursor-wait disabled:opacity-50">
            {status === 'creating' ? 'CREATING INTENT…' : `CONTINUE WITH ${currency}`}
          </button>
        ) : isSolana ? (
          <div className="mt-6 space-y-4">
            {intent.reference && intent.treasuryAddress && (
              <div className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
                <div className="rounded-[3px] border border-[var(--line)] bg-white p-3">
                  <QRCodeSVG
                    value={buildSolanaPayUrl({
                      recipient: new PublicKey(intent.treasuryAddress),
                      reference: new PublicKey(intent.reference),
                      amountCrypto: intent.expectedAmountCrypto,
                      currency,
                      usdcMint: intent.usdcMint ? new PublicKey(intent.usdcMint) : undefined,
                      label: 'NOTHING',
                      message: `Receipt #${String(intent.sequenceNumber).padStart(5, '0')}`,
                    })}
                    size={136}
                    style={{ width: '100%', height: 'auto' }}
                  />
                </div>
                <div>
                  <div className="font-mono text-xs text-[#666]">MOBILE WALLET</div>
                  <div className="mt-1 text-sm text-[#aaa]">Scan this QR with a Solana Pay-compatible wallet, including on your phone. The server watches the unique reference and can verify the payment without a connected browser wallet.</div>
                </div>
              </div>
            )}
            {!qrMode && (
              <>
                <WalletMultiButton style={{ width: '100%', justifyContent: 'center', borderRadius: 2, background: '#161616', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                <button onClick={paySolana} disabled={!wallet.publicKey || !wallet.signTransaction || status === 'signing' || status === 'verifying'} className="w-full rounded-[2px] border border-[var(--gold)] px-6 py-3.5 font-mono text-sm font-bold text-[var(--gold)] disabled:opacity-40">
                  {status === 'signing' ? 'AWAITING SIGNATURE…' : status === 'verifying' ? 'VERIFYING ON CHAIN…' : `SEND ${intent.expectedAmountCrypto} ${currency}`}
                </button>
              </>
            )}
            <button onClick={() => setQrMode((value) => !value)} className="w-full rounded-[2px] border border-[var(--line)] px-6 py-3 font-mono text-xs text-[#aaa] hover:text-white">
              {qrMode ? 'USE CONNECTED WALLET INSTEAD' : 'I WANT TO PAY FROM MY PHONE →'}
            </button>
            <small className="block font-mono text-[10px] leading-5 text-[#555]">The server verifies recipient, amount, finality, reference and signature reuse. The browser cannot mark the payment as verified.</small>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-[180px_1fr]">
            <div className="rounded-[3px] border border-[var(--line)] bg-white p-3">
              <QRCodeSVG value={intent.paymentUrl || intent.paymentAddress || intent.id} size={152} style={{ width: '100%', height: 'auto' }} />
            </div>
            <div>
              <div className="font-mono text-xs text-[#666]">SEND EXACTLY</div>
              <div className="mt-1 break-all font-mono text-lg text-[var(--green)]">{intent.expectedAmountCrypto} {currency}</div>
              <div className="mt-4 font-mono text-xs text-[#666]">TO ADDRESS</div>
              <div className="mt-1 break-all rounded-[2px] border border-[var(--line)] bg-[#050505] p-3 font-mono text-xs text-[#aaa]">{intent.paymentAddress}</div>
              {intent.paymentUrl && <a href={intent.paymentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs text-[var(--gold)] hover:underline">OPEN GATEWAY CHECKOUT →</a>}
              <div className="mt-5 text-xs leading-5 text-[#555]">The gateway monitors the blockchain and calls the signed webhook only after its provider-side confirmation rules.</div>
            </div>
          </div>
        )}

        {error && <div className="mt-5 rounded-[2px] border border-[#402424] bg-[#130909] p-3 font-mono text-xs text-[#eaa]">{error}</div>}
      </div>
    </Overlay>
  )
}


function base64ToBytes(value: string) {
  const binary = window.atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function bytesToBase64(value: Uint8Array) {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return window.btoa(binary)
}

function Overlay({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/80 p-4 backdrop-blur-sm">{children}</div>
}

function Success({ sequence, signature, onClose }: { sequence?: number; signature: string; onClose: () => void }) {
  return (
    <div className="w-full max-w-lg rounded-[4px] border border-[var(--line)] bg-[#0a0a0a] p-8 text-center">
      <div className="font-mono text-xs tracking-[0.2em] text-[var(--green)]">PAYMENT VERIFIED.</div>
      <h2 className="mt-3 font-serif text-4xl">You own exactly what you owned before.</h2>
      <p className="mt-4 font-mono text-sm text-[#888]">Receipt #{String(sequence ?? 0).padStart(5, '0')} has been verified.</p>
      {signature && <a className="mt-4 inline-block break-all font-mono text-xs text-[var(--gold)] hover:underline" href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">VIEW TRANSACTION →</a>}
      <div className="mt-7 flex gap-2 justify-center">
        <button onClick={onClose} className="rounded-[2px] border border-[var(--line)] px-5 py-3 font-mono text-xs text-[#aaa] hover:text-white">CLOSE</button>
      </div>
    </div>
  )
}
