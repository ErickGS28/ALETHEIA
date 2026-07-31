import type { NextConfig } from 'next';

// solicitudes-mf — microfrontend independiente (Next.js Multi-Zones).
const nextConfig: NextConfig = {
  basePath: '/solicitudes',
  assetPrefix: '/solicitudes',
  transpilePackages: ['@aletheia/frontend-commons'],
};

export default nextConfig;
