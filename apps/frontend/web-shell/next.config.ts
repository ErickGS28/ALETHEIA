import type { NextConfig } from 'next';

/**
 * web-shell — host de microfrontends (SOFEA + Next.js Multi-Zones).
 * Cada microfrontend es una app Next.js independiente; el host las une bajo
 * un solo dominio vía rewrites. Cada MF declara su propio basePath/assetPrefix.
 */
const ZONES: Record<string, string> = {
  solicitudes: process.env.MF_SOLICITUDES_URL ?? 'http://localhost:4001',
  contratos: process.env.MF_CONTRATOS_URL ?? 'http://localhost:4002',
  documentos: process.env.MF_DOCUMENTOS_URL ?? 'http://localhost:4003',
  flujo: process.env.MF_FLUJO_URL ?? 'http://localhost:4004',
  firmas: process.env.MF_FIRMAS_URL ?? 'http://localhost:4005',
  reportes: process.env.MF_REPORTES_URL ?? 'http://localhost:4006',
  admin: process.env.MF_ADMIN_URL ?? 'http://localhost:4007',
};

const nextConfig: NextConfig = {
  transpilePackages: ['@aletheia/frontend-commons'],
  async rewrites() {
    return Object.entries(ZONES).flatMap(([zone, url]) => [
      { source: `/${zone}`, destination: `${url}/${zone}` },
      { source: `/${zone}/:path*`, destination: `${url}/${zone}/:path*` },
    ]);
  },
};

export default nextConfig;
