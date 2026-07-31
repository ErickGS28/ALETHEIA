import type { NextConfig } from 'next';

// contratos-mf — microfrontend independiente (Next.js Multi-Zones).
const nextConfig: NextConfig = {
  basePath: '/contratos',
  assetPrefix: '/contratos',
  transpilePackages: ['@aletheia/frontend-commons'],
};

export default nextConfig;
