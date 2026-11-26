import { enquiryResponse } from '../../../../server/enquiry';

// Built only on Vercel (see pageExtensions in next.config.ts); scripts/serve.mjs serves it elsewhere.
export const dynamic = 'force-dynamic';

export function POST(request: Request) {
  const clientKey = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return enquiryResponse(request, clientKey);
}
