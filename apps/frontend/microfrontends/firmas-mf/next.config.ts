import type { NextConfig } from 'next';

// firmas-mf — microfrontend independiente (Next.js Multi-Zones).
const nextConfig: NextConfig = {
  basePath: '/firmas',
  assetPrefix: '/firmas',
  transpilePackages: ['@aletheia/frontend-commons'],
};

export default nextConfig;
