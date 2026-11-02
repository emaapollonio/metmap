import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // Korenski package-lock.json mobilne app bi Next sicer zaznal kot koren projekta.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
