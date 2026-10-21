'use client'

import { useEffect, useRef } from 'react'

/**
 * Site-wide backdrop: slow drifting gold/purple haze plus a soft spotlight that
 * follows the pointer on devices with a mouse. Only transforms/opacity animate,
 * so it stays on the compositor and costs almost nothing on phones.
 */
export function AmbientBackground() {
  const spotlight = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = spotlight.current
    if (!node) return
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!finePointer || reducedMotion) return

    let frame = 0
    let x = window.innerWidth / 2
    let y = window.innerHeight / 3
    const onMove = (event: PointerEvent) => {
      x = event.clientX
      y = event.clientY
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        node.style.transform = `translate3d(${x - 300}px, ${y - 300}px, 0)`
        node.style.opacity = '1'
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div aria-hidden className="ambient pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="ambient-blob ambient-blob-gold" />
      <div className="ambient-blob ambient-blob-purple" />
      <div className="ambient-blob ambient-blob-green" />
      <div ref={spotlight} className="ambient-spotlight" />
      <div className="ambient-grain" />
    </div>
  )
}
