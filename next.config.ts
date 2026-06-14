import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;


const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;