import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: "NTrack",
    short_name: "NTrack",
    start_url: "/dashboard",
    display: "standalone",
    theme_color: "#1A434E",
    background_color: "#FFF0E2",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  });
}