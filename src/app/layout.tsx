import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nail Technician App',
  description: 'Track services, tips, commissions, and turns',
  manifest: '/manifest.json',
  themeColor: '#0A0A0C',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}