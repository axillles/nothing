'use client'

import type { ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { motion } from 'framer-motion'

export function GoldButton({ href, children, onClick, type = 'button', className = '' }: {
  href?: Route
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
}) {
  const cls = `inline-flex items-center justify-center rounded-[2px] border border-transparent bg-[var(--gold)] px-7 py-4 text-sm font-bold tracking-[0.06em] text-[var(--bg)] transition-transform hover:-translate-y-0.5 ${className}`
  if (href) return <Link href={href} className={cls}>{children}</Link>
  return <motion.button whileTap={{ scale: 0.98 }} type={type} onClick={onClick} className={cls}>{children}</motion.button>
}
