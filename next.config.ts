import type { NextConfig } from 'next';

// On Vercel the site runs as a normal Next.js app so /api/availability can read the
// Google Calendar. Everywhere else it is exported as static files served by scripts/serve.mjs.
const onVercel = process.env.VERCEL === '1';

const nextConfig: NextConfig = {
  output: onVercel ? undefined : 'export',
  // `route.server.ts` files are server-only endpoints that a static export cannot include.
  pageExtensions: onVercel ? ['tsx', 'ts', 'server.ts'] : ['tsx', 'ts'],
  trailingSlash: true,
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    deviceSizes: [480, 960, 1440, 1920],
    imageSizes: [],
  },
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
