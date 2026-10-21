'use client'

import { useEffect, useRef } from 'react'

const COLORS = ['#c9a227', '#f3d77a', '#f5f1e8', '#8b5cf6', '#00ff66']
const GLYPHS = ['∅', '0', '○']
const DURATION_MS = 3200

type Piece = {
  x: number; y: number; vx: number; vy: number; rotation: number; spin: number
  size: number; color: string; kind: 'paper' | 'ring' | 'glyph'; glyph: string; wobble: number
}

/** One-shot celebratory burst of "nothing": gold paper, hollow rings and ∅ glyphs. */
export function NothingConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    context.setTransform(dpr, 0, 0, dpr, 0, 0)

    const count = width < 640 ? 90 : 160
    const pieces: Piece[] = Array.from({ length: count }, (_, index) => {
      const fromLeft = index % 2 === 0
      const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.9
      const speed = 700 + Math.random() * 650
      const roll = Math.random()
      return {
        x: fromLeft ? width * 0.15 : width * 0.85,
        y: height * 0.75,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 12,
        size: 6 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        kind: roll < 0.55 ? 'paper' : roll < 0.75 ? 'ring' : 'glyph',
        glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        wobble: Math.random() * Math.PI * 2,
      }
    })

    const start = performance.now()
    let last = start
    let frame = 0
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const elapsed = now - start
      const fade = Math.max(0, 1 - Math.max(0, elapsed - DURATION_MS * 0.6) / (DURATION_MS * 0.4))
      context.clearRect(0, 0, width, height)
      for (const piece of pieces) {
        piece.vy += 1400 * dt
        piece.vx *= 0.985
        piece.vy *= 0.985
        piece.x += piece.vx * dt + Math.sin(now / 200 + piece.wobble) * 0.6
        piece.y += piece.vy * dt
        piece.rotation += piece.spin * dt
        context.save()
        context.globalAlpha = fade
        context.translate(piece.x, piece.y)
        context.rotate(piece.rotation)
        if (piece.kind === 'paper') {
          context.fillStyle = piece.color
          context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2 * Math.abs(Math.cos(now / 150 + piece.wobble)) + 1)
        } else if (piece.kind === 'ring') {
          context.strokeStyle = piece.color
          context.lineWidth = 1.6
          context.beginPath()
          context.arc(0, 0, piece.size / 2, 0, Math.PI * 2)
          context.stroke()
        } else {
          context.fillStyle = piece.color
          context.font = `700 ${piece.size * 1.8}px ui-monospace, monospace`
          context.textAlign = 'center'
          context.textBaseline = 'middle'
          context.fillText(piece.glyph, 0, 0)
        }
        context.restore()
      }
      if (elapsed < DURATION_MS) frame = window.requestAnimationFrame(tick)
      else context.clearRect(0, 0, width, height)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />
}
