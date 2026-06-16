import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1A434E',
}

// export const metadata: Metadata = {
//   title: {
//     default: 'NTrack',
//     template: '%s | NTrack',
//   },
//   description:
//     'NTrack is a powerful web application designed to help nail technicians track their services, analyze performance, and optimize their business with precision.',
//   manifest: '/manifest.json',
//   icons: {
//     apple: '/icons/icon-192x192.png',
//   },
//   appleWebApp: {
//     capable: true,
//     statusBarStyle: 'black-translucent',
//     title: 'NTrack',
//   },
// }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}