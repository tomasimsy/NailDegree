import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';
import path from 'path';

// 1. Initialize the modern PWA wrapper with your custom configuration
const withPWA = withPWAInit({
  dest: 'public',
  manifestFilename: 'manifest.json', // Stops the .webmanifest syntax errors
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Keeps things snappy in development
  buildExcludes: [/middleware-manifest.json$/],
});

// 2. Define your base Next.js configuration
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(process.cwd()),
  },
  // Add any other standard next settings here
};

// 3. Wrap your config ONCE and export it as the default module
export default withPWA(nextConfig);