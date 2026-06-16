import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  // your existing config (if any)
  reactStrictMode: true,
  // optional: disable TypeScript build errors if needed
  // typescript: { ignoreBuildErrors: true },
};

export default withPWA({
  dest: 'public',           // service worker will be generated in public folder
  register: true,           // automatically register the service worker
  skipWaiting: true,        // force new service worker to take control
  disable: process.env.NODE_ENV === 'development', // disable PWA in dev (optional)
})(nextConfig);