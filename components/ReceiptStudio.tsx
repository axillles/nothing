'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toPng } from 'html-to-image'
import { ReceiptShareCard, RECEIPT_HEIGHT, RECEIPT_WIDTH, type ReceiptCardData } from './ReceiptShareCard'
import { RECEIPT_CAPTIONS, RECEIPT_THEMES, receiptQuery, type ReceiptOptions } from '@/lib/receipt/themes'

const MAX_PHOTO_BYTES = 15 * 1024 * 1024

/** Axiom-style share-card editor: pick art, caption and details, then download or share. */
export function ReceiptStudio({ paymentId, data, initial, site }: { paymentId: string; data: ReceiptCardData; initial: ReceiptOptions; site: string }) {
  const [options, setOptions] = useState(initial)
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const frame = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  // Scale the fixed 1200×630 card to the available width.
  useEffect(() => {
    const node = frame.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / RECEIPT_WIDTH))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Keep the URL shareable: the link preview uses the same theme/caption.
  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}?${receiptQuery(options)}`)
  }, [options])

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo) }, [photo])

  function update(patch: Partial<ReceiptOptions>) {
    setOptions((value) => ({ ...value, ...patch }))
  }

  function flash(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  function onPhoto(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > MAX_PHOTO_BYTES) return flash('Pick an image under 15 MB')
    setPhoto(URL.createObjectURL(file))
  }

  async function download() {
    if (!card.current) return
    setBusy(true)
    try {
      const dataUrl = await toPng(card.current, { width: RECEIPT_WIDTH, height: RECEIPT_HEIGHT, pixelRatio: 2, cacheBust: true, style: { transform: 'none' } })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `nothing-receipt-${String(data.sequenceNumber).padStart(5, '0')}.png`
      link.click()
    } catch {
      flash('Could not render the image, try again')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      flash('Link copied')
    } catch {
      flash('Copy the address bar instead')
    }
  }

  const shareText = `I just paid $${data.amountUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })} for absolutely nothing. Receipt #${String(data.sequenceNumber).padStart(5, '0')}.`
  const shareOnX = () => {
    const url = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const artSrc = photo ?? `/receipt-art/${options.theme.id}.svg`

  return (
    <div>
      <div ref={frame} className="relative w-full overflow-hidden rounded-[6px] border border-[var(--line)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]" style={{ height: RECEIPT_HEIGHT * scale }}>
        <motion.div key={`${options.theme.id}-${photo ?? ''}`} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: RECEIPT_WIDTH, height: RECEIPT_HEIGHT }}>
          <div ref={card}>
            <ReceiptShareCard data={data} options={options} artSrc={artSrc} site={site} fontFamily="var(--font-sans), Arial, sans-serif" />
          </div>
        </motion.div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_1fr]">
        <div>
          <Label>BACKGROUND</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {RECEIPT_THEMES.map((theme) => {
              const active = !photo && options.theme.id === theme.id
              return (
                <button key={theme.id} type="button" onClick={() => { setPhoto(null); update({ theme }) }} className={`group overflow-hidden rounded-[3px] border text-left transition-colors ${active ? 'border-[var(--gold)]' : 'border-[var(--line)] hover:border-[#333]'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/receipt-art/${theme.id}.svg`} alt="" className="aspect-[700/630] w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className={`px-2 py-1.5 font-mono text-[10px] tracking-[0.1em] ${active ? 'text-[var(--gold)]' : 'text-[#777]'}`}>{theme.name.toUpperCase()}</div>
                </button>
              )
            })}
          </div>
          <label className={`mt-2 flex cursor-pointer items-center justify-center rounded-[3px] border border-dashed px-3 py-3 font-mono text-[11px] transition-colors ${photo ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[#333] text-[#888] hover:text-white'}`}>
            {photo ? 'YOUR PHOTO ✓ · TAP TO CHANGE' : '+ USE YOUR OWN PHOTO'}
            <input type="file" accept="image/*" className="hidden" onChange={(event) => onPhoto(event.target.files?.[0])} />
          </label>
          <p className="mt-1.5 font-mono text-[10px] leading-4 text-[#555]">Your photo never leaves your device. It goes into the downloaded PNG only; shared links use the selected background.</p>
          {photo && (
            <div className="mt-2">
              <Label>TEXT COLOURS</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {RECEIPT_THEMES.map((theme) => (
                  <button key={theme.id} type="button" title={theme.name} onClick={() => update({ theme })} className={`h-7 w-7 rounded-full border-2 ${options.theme.id === theme.id ? 'border-[var(--gold)]' : 'border-transparent'}`} style={{ background: `linear-gradient(135deg, ${theme.base} 50%, ${theme.accent} 50%)` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <Label>CAPTION</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RECEIPT_CAPTIONS.map((caption) => (
              <button key={caption} type="button" onClick={() => update({ caption })} className={`rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-[0.06em] transition-colors ${options.caption === caption ? 'border-[var(--gold)] bg-[#16120a] text-[var(--gold)]' : 'border-[var(--line)] text-[#888] hover:text-white'}`}>
                {caption}
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {data.displayName && <Toggle label="Show my name" checked={options.showName} onChange={(showName) => update({ showName })} />}
            <Toggle label={`Show ${data.currency} amount`} checked={options.showCrypto} onChange={(showCrypto) => update({ showCrypto })} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={download} disabled={busy} className="col-span-2 rounded-[2px] bg-[var(--gold)] px-4 py-3.5 font-mono text-xs font-bold text-[var(--bg)] disabled:opacity-50">
              {busy ? 'RENDERING…' : 'DOWNLOAD PNG'}
            </motion.button>
            <button type="button" onClick={shareOnX} className="rounded-[2px] border border-[var(--line)] px-4 py-3 font-mono text-xs text-[#ccc] hover:border-[#333] hover:text-white">SHARE ON X</button>
            <button type="button" onClick={copyLink} className="rounded-[2px] border border-[var(--line)] px-4 py-3 font-mono text-xs text-[#ccc] hover:border-[#333] hover:text-white">COPY LINK</button>
          </div>
          <div className="mt-2 min-h-[18px] text-center font-mono text-[11px] text-[var(--green)]">{notice}</div>
          <a href={`/api/receipts/${paymentId}/image?${receiptQuery(options)}`} target="_blank" rel="noreferrer" className="block text-center font-mono text-[10px] text-[#555] hover:text-[#999]">Link preview image →</a>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[11px] tracking-[0.16em] text-[#666]">{children}</div>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between rounded-[2px] border border-[var(--line)] px-3 py-2.5 font-mono text-xs text-[#aaa] hover:border-[#333]">
      {label}
      <span className={`relative h-4 w-7 rounded-full transition-colors ${checked ? 'bg-[var(--gold)]' : 'bg-[#333]'}`}>
        <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="absolute top-0.5 h-3 w-3 rounded-full bg-[var(--ivory)]" style={{ left: checked ? 14 : 2 }} />
      </span>
    </button>
  )
}
