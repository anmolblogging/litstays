import nodemailer from 'nodemailer';
import { dateInZone, isVillaSlug, stayError, validDate, nightsBetween, type VillaSlug } from '../src/lib/availability-rules';
import { villaOption } from '../src/lib/villa-options';
import { availabilityService } from './availability-api';

export type Enquiry = {
  name: string; contact: string; villa: VillaSlug; checkIn: string; checkOut: string;
  guests: number; budget: string; food: string; message: string;
};
export type MailMessage = { from: string; to: string; replyTo?: string; subject: string; text: string };
type Dependencies = {
  env?: Record<string, string | undefined>;
  now?: () => number;
  sendMail?: (message: MailMessage) => Promise<unknown>;
  checkDates?: (enquiry: Enquiry) => Promise<string | null>;
};

const budgets = ['₹10,000 – ₹25,000', '₹25,000 – ₹50,000', '₹50,000 – ₹75,000', '₹75,000 – ₹1,00,000', 'Above ₹1,00,000'];
const foods = ['Veg', 'Non-Veg', 'Jain'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s().-]{7,22}$/;
const MAX_BODY = 16_000;

// One line, no control characters: keeps user text out of email headers.
const line = (value: unknown, max: number) => String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);
const block = (value: unknown, max: number) => String(value ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max);

export function validateEnquiry(input: Record<string, unknown>, today: string): { enquiry: Enquiry } | { error: string } {
  const name = line(input.name, 100);
  const contact = line(input.contact, 150);
  const villa = line(input.villa, 40);
  const checkIn = line(input.checkIn, 10);
  const checkOut = line(input.checkOut, 10);
  const guests = Number(input.guests);
  const budget = line(input.budget, 40);
  const food = line(input.food, 20);
  const message = block(input.message, 1500);
  if (!name) return { error: 'Please tell us your name.' };
  if (!emailPattern.test(contact) && !phonePattern.test(contact)) return { error: 'Please enter a valid email address or phone number.' };
  if (!isVillaSlug(villa)) return { error: 'Please choose a villa.' };
  if (!validDate(checkIn) || !validDate(checkOut) || checkOut <= checkIn) return { error: 'Check-out needs to be after your check-in date.' };
  if (checkIn < today) return { error: 'Please choose a check-in date from today onwards.' };
  if (nightsBetween(checkIn, checkOut) > 60) return { error: 'For stays longer than 60 nights, please contact us directly.' };
  const capacity = villaOption(villa)?.capacity ?? 0;
  if (!Number.isInteger(guests) || guests < 1) return { error: 'Please enter a whole number of guests, starting from one.' };
  if (guests > capacity) return { error: `${villaOption(villa)?.name} accommodates up to ${capacity} guests.` };
  if (!budgets.includes(budget)) return { error: 'Please choose an approximate budget.' };
  if (!foods.includes(food)) return { error: 'Please choose a food preference.' };
  return { enquiry: { name, contact, villa, checkIn, checkOut, guests, budget, food, message } };
}

function longDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

export function composeEnquiryEmail(enquiry: Enquiry, user: string, to: string): MailMessage {
  const villaName = villaOption(enquiry.villa)?.name ?? enquiry.villa;
  const nights = nightsBetween(enquiry.checkIn, enquiry.checkOut);
  const text = [
    `New stay enquiry from the website`,
    ``,
    `Villa: ${villaName}`,
    `Check-in: ${longDate(enquiry.checkIn)}`,
    `Check-out: ${longDate(enquiry.checkOut)} (${nights} ${nights === 1 ? 'night' : 'nights'})`,
    `Guests: ${enquiry.guests}`,
    ``,
    `Name: ${enquiry.name}`,
    `Contact: ${enquiry.contact}`,
    `Approximate budget: ${enquiry.budget}`,
    `Food preference: ${enquiry.food}`,
    ...(enquiry.message ? [``, `About their plans:`, enquiry.message] : []),
    ``,
    `The dates were free in the Lit Stays bookings calendar when this was sent. Add the booking to that calendar once confirmed.`,
  ].join('\n');
  return {
    from: `"The LIT Stays website" <${user}>`,
    to,
    ...(emailPattern.test(enquiry.contact) ? { replyTo: enquiry.contact } : {}),
    subject: `Enquiry: ${villaName}, ${enquiry.checkIn} to ${enquiry.checkOut} – ${enquiry.name}`,
    text,
  };
}

const requests = new Map<string, { count: number; reset: number }>();

export async function enquiryResponse(request: Request, clientKey: string, dependencies: Dependencies = {}): Promise<Response> {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const reply = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers });
  if (request.method !== 'POST') return reply(405, { status: 'error', message: 'Method not allowed.' });
  const env = dependencies.env ?? process.env;
  const now = dependencies.now ?? Date.now;

  const bucket = requests.get(clientKey);
  if (bucket && bucket.reset > now() && bucket.count >= 5) return reply(429, { status: 'error', message: 'Please wait a few minutes before sending another enquiry.' });
  if (!bucket || bucket.reset <= now()) {
    if (requests.size >= 1024) requests.delete(requests.keys().next().value!);
    requests.set(clientKey, { count: 1, reset: now() + 10 * 60_000 });
  } else bucket.count++;

  let input: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return reply(413, { status: 'error', message: 'That enquiry is too long.' });
    input = JSON.parse(raw);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Not an object');
  } catch { return reply(400, { status: 'error', message: 'Please check your enquiry and try again.' }); }

  // Hidden field that people never fill in; bots usually do. Pretend it worked.
  if (line(input.website, 200)) return reply(200, { status: 'sent' });

  const result = validateEnquiry(input, dateInZone(now(), 'Asia/Kolkata'));
  if ('error' in result) return reply(400, { status: 'error', message: result.error });
  const { enquiry } = result;

  const user = env.GMAIL_USER?.trim();
  const pass = env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  const to = env.ENQUIRY_TO_EMAIL?.trim() || user;
  if (!dependencies.sendMail && (!user || !pass || !to)) return reply(503, { status: 'unavailable', message: 'Email is not set up yet.' });

  const checkDates = dependencies.checkDates ?? (async (value: Enquiry) => {
    const data = await availabilityService().get(value.checkIn, value.checkOut, true, value.villa);
    return stayError(value.checkIn, value.checkOut, data.unavailable, data.minStayNights);
  });
  try {
    const conflict = await checkDates(enquiry);
    if (conflict) return reply(409, { status: 'error', message: conflict });
  } catch {
    // The calendar being briefly unreachable should not lose a guest's enquiry; the owner checks dates anyway.
  }

  const send = dependencies.sendMail ?? (message => nodemailer.createTransport({ service: 'gmail', auth: { user: user!, pass: pass! } }).sendMail(message));
  try {
    await send(composeEnquiryEmail(enquiry, user || 'website@thelitstays', to!));
    return reply(200, { status: 'sent' });
  } catch {
    return reply(502, { status: 'unavailable', message: 'We couldn’t send your enquiry just now.' });
  }
}
