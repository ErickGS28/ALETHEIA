import type { NextConfig } from 'next';

// documentos-mf — microfrontend independiente (Next.js Multi-Zones).
const nextConfig: NextConfig = {
  basePath: '/documentos',
  assetPrefix: '/documentos',
  transpilePackages: ['@aletheia/frontend-commons'],
};

export default nextConfig;
