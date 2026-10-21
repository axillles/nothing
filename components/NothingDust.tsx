'use client'

import { useEffect, useRef } from 'react'

type Speck = { x: number; y: number; r: number; vx: number; vy: number; phase: number; speed: number; ring: boolean }

/**
 * Floating gold dust behind the hero: "nothing" drifting in the air.
 * Pauses when off-screen or when the tab is hidden; static when reduced motion is on.
 */
export function NothingDust({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let specks: Speck[] = []
    let frame = 0
    let visible = true
    let last = performance.now()

    const seed = () => {
      const count = Math.round(Math.min(90, (width * height) / 9000))
      specks = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.4 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 6,
        vy: -(3 + Math.random() * 10),
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.4,
        // A few hollow rings: literal nothing.
        ring: Math.random() < 0.12,
      }))
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
      draw(0)
    }

    const draw = (dt: number) => {
      context.clearRect(0, 0, width, height)
      const t = performance.now() / 1000
      for (const speck of specks) {
        speck.x += speck.vx * dt
        speck.y += speck.vy * dt
        if (speck.y < -10) { speck.y = height + 10; speck.x = Math.random() * width }
        if (speck.x < -10) speck.x = width + 10
        if (speck.x > width + 10) speck.x = -10
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * speck.speed + speck.phase))
        const alpha = twinkle * (speck.ring ? 0.5 : 0.75)
        if (speck.ring) {
          context.strokeStyle = `rgba(201,162,39,${alpha})`
          context.lineWidth = 0.8
          context.beginPath()
          context.arc(speck.x, speck.y, speck.r * 3, 0, Math.PI * 2)
          context.stroke()
        } else {
          context.fillStyle = `rgba(232,200,110,${alpha})`
          context.beginPath()
          context.arc(speck.x, speck.y, speck.r, 0, Math.PI * 2)
          context.fill()
        }
      }
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      draw(dt)
      frame = window.requestAnimationFrame(loop)
    }
    const start = () => {
      if (reducedMotion || frame || !visible || document.hidden) return
      last = performance.now()
      frame = window.requestAnimationFrame(loop)
    }
    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame)
      frame = 0
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else stop()
    })
    intersection.observe(canvas)
    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVisibility)

    resize()
    start()
    return () => {
      stop()
      resizeObserver.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />
}
