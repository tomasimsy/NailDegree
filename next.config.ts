import type { NextConfig } from 'next';
import withPWA from 'next-pwa';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly set the project root to the current working directory
    root: path.join(process.cwd()),
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest.json$/],
});

// Wrap once, export once
export default pwaConfig(nextConfig);