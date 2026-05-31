import type { Metadata } from 'next'
import { viewport } from './viewport'
import './globals.css'

export { viewport }

export const metadata: Metadata = {
  title: 'Trading Signals',
  description: 'Intraday and delivery trading signal dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
