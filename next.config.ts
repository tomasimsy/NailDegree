import type { NextConfig } from 'next';
import withPWA from 'next-pwa';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(process.cwd()),
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // This is the key for Vercel
  buildExcludes: [/middleware-manifest.json$/],
})(nextConfig);