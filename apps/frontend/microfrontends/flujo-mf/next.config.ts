import type { NextConfig } from 'next';

// flujo-mf — microfrontend independiente (Next.js Multi-Zones).
const nextConfig: NextConfig = {
  basePath: '/flujo',
  assetPrefix: '/flujo',
  transpilePackages: ['@aletheia/frontend-commons'],
};

export default nextConfig;
