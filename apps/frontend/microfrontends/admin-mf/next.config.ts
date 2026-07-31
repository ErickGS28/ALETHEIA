import type { NextConfig } from 'next';

// admin-mf — microfrontend independiente (Next.js Multi-Zones).
const nextConfig: NextConfig = {
  basePath: '/admin',
  assetPrefix: '/admin',
  transpilePackages: ['@aletheia/frontend-commons'],
};

export default nextConfig;
