import type { Metadata, Viewport } from 'next'
import './globals.css'

// 1. Unified Viewport Configuration
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1A434E",
};

// 2. Clean, Single Metadata Definition
export const metadata: Metadata = {
  title: {
    default: 'NTrack',
    template: '%s | NTrack'
  },
  description: 'NTrack is a powerful web application designed to help nail technicians track their services, analyze performance, and optimize their business with precision.',
  manifest: '/manifest.json', // <-- Crucial: Forces the layout to cleanly fetch the public static JSON file
  icons: {
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NTrack',
    // Added leading slashes to prevent relative routing breaks on mobile devices
    startupImage: [
      { url: '/splash_screens/iPhone_17_Pro_Max__iPhone_16_Pro_Max_portrait.png', media: 'screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash_screens/iPhone_17_Pro__iPhone_17__iPhone_16_Pro_portrait.png', media: 'screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash_screens/iPhone_16_Plus__iPhone_15_Pro_Max__iPhone_15_Plus__iPhone_14_Pro_Max_portrait.png', media: 'screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash_screens/iPhone_Air_portrait.png', media: 'screen and (device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash_screens/iPhone_16__iPhone_15_Pro__iPhone_15__iPhone_14_Pro_portrait.png', media: 'screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash_screens/iPhone_14_Plus__iPhone_13_Pro_Max__iPhone_12_Pro_Max_portrait.png', media: 'screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash_screens/iPhone_17e__iPhone_16e__iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_portrait.png', media: 'screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      { url: '/splash_screens/13__iPad_Pro_M4_portrait.png', media: 'screen and (device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash_screens/12.9__iPad_Pro_portrait.png', media: 'screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash_screens/11__iPad_Pro_M4_portrait.png', media: 'screen and (device-width: 834px) and (device-height: 1210px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash_screens/11__iPad_Pro__10.5__iPad_Pro_portrait.png', media: 'screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash_screens/10.9__iPad_Air_portrait.png', media: 'screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash_screens/10.2__iPad_portrait.png', media: 'screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      { url: '/splash_screens/8.3__iPad_Mini_portrait.png', media: 'screen and (device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
    ],
  },
}

// 3. Clean Root Layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  )
}