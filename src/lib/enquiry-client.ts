export type EnquiryPayload = {
  name: string; contact: string; villa: string; checkIn: string; checkOut: string;
  guests: string; budget: string; food: string; message: string; website: string;
};
export type EnquiryResult = { status: 'sent' } | { status: 'rejected'; message: string } | { status: 'unavailable' };

// Sends the enquiry to /api/enquiry, which emails it to the owner.
// 'rejected' means the guest should fix something; 'unavailable' means email couldn't be sent.
export async function sendEnquiry(payload: EnquiryPayload): Promise<EnquiryResult> {
  const origin = (process.env.NEXT_PUBLIC_AVAILABILITY_API_URL || '').replace(/\/$/, '');
  try {
    const response = await fetch(`${origin}/api/enquiry/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'omit', cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    const body = await response.json().catch(() => ({})) as { status?: string; message?: string };
    if (response.ok && body.status === 'sent') return { status: 'sent' };
    if ((response.status === 400 || response.status === 409 || response.status === 429) && body.message) return { status: 'rejected', message: body.message };
    return { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
}
