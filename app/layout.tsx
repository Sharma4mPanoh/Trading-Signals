import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Trading Signals',
  description: 'Rule-based intraday and delivery signal dashboard',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
