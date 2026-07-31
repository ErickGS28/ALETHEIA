import type { NextConfig } from 'next';

// reportes-mf — microfrontend independiente (Next.js Multi-Zones).
const nextConfig: NextConfig = {
  basePath: '/reportes',
  assetPrefix: '/reportes',
  transpilePackages: ['@aletheia/frontend-commons'],
};

export default nextConfig;
