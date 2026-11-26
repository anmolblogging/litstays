import { availabilityResponse } from '../../../../server/availability-api';

// Built only on Vercel (see pageExtensions in next.config.ts). The static export
// used by `npm start` serves the same endpoint from scripts/serve.mjs instead.
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const clientKey = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return availabilityResponse(new URL(request.url), clientKey);
}
