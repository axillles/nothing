import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { DM_Serif_Display, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { AmbientBackground } from '@/components/AmbientBackground'

const serif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-sans' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-mono' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'NOTHING. — Pay for Nothing',
  description: 'No product. No subscription. No utility. Just a payment.',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
        <AmbientBackground />
        {children}
      </body>
    </html>
  )
}
