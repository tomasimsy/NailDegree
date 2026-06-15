import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';
import path from 'path';

// 1. Minimum valid configuration properties
const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

// 2. Base Next.js configuration
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(process.cwd()),
  },
};

export default withPWA(nextConfig);