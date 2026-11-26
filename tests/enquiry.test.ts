import test from 'node:test';
import assert from 'node:assert/strict';
import { composeEnquiryEmail, enquiryResponse, validateEnquiry, type MailMessage } from '../server/enquiry';

const now = () => Date.parse('2026-11-26T10:00:00+05:30');
const valid = { name: 'Riya Shah', contact: 'riya@example.com', villa: 'villa-avante', checkIn: '2026-12-05', checkOut: '2026-12-07', guests: '12', budget: '₹25,000 – ₹50,000', food: 'Veg', message: 'Birthday weekend', website: '' };
const env = { GMAIL_USER: 'owner@example.com', GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop' };
const post = (body: unknown) => new Request('http://localhost/api/enquiry/', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
let ip = 0;
const client = () => `test-${++ip}`;

test('a valid enquiry is emailed to the owner with the villa, dates and a reply-to', async () => {
  const sent: MailMessage[] = [];
  const response = await enquiryResponse(post(valid), client(), { env, now, sendMail: async message => { sent.push(message); }, checkDates: async () => null });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'sent' });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'owner@example.com');
  assert.equal(sent[0].replyTo, 'riya@example.com');
  assert.match(sent[0].subject, /Villa Avante, 2026-12-05 to 2026-12-07 – Riya Shah/);
  assert.match(sent[0].text, /Villa: Villa Avante/);
  assert.match(sent[0].text, /\(2 nights\)/);
  assert.match(sent[0].text, /Birthday weekend/);
});

test('ENQUIRY_TO_EMAIL can send enquiries to a different inbox; phone contacts get no reply-to', () => {
  const result = validateEnquiry({ ...valid, contact: '+91 98765 43210' }, '2026-11-26');
  assert.ok('enquiry' in result);
  const message = composeEnquiryEmail(result.enquiry, 'owner@example.com', 'bookings@example.com');
  assert.equal(message.to, 'bookings@example.com');
  assert.equal(message.replyTo, undefined);
});

test('booked dates are refused before any email is sent', async () => {
  let sent = 0;
  const response = await enquiryResponse(post(valid), client(), { env, now, sendMail: async () => { sent++; }, checkDates: async () => 'Those dates include an unavailable night. Please choose another stay.' });
  assert.equal(response.status, 409);
  assert.match((await response.json()).message, /unavailable night/);
  assert.equal(sent, 0);
});

test('invalid enquiries explain what to fix', () => {
  const cases: [Record<string, unknown>, RegExp][] = [
    [{ ...valid, name: ' ' }, /name/],
    [{ ...valid, contact: 'nope' }, /email address or phone/],
    [{ ...valid, villa: 'villa-moon' }, /choose a villa/],
    [{ ...valid, checkOut: '2026-12-05' }, /after your check-in/],
    [{ ...valid, checkIn: '2026-11-20', checkOut: '2026-11-22' }, /today onwards/],
    [{ ...valid, guests: '16' }, /Villa Avante accommodates up to 15/],
    [{ ...valid, guests: '2.5' }, /whole number/],
    [{ ...valid, budget: 'free' }, /budget/],
    [{ ...valid, food: 'Pizza' }, /food preference/],
  ];
  for (const [input, message] of cases) {
    const result = validateEnquiry(input, '2026-11-26');
    assert.ok('error' in result && message.test(result.error), `${JSON.stringify(input)} → ${JSON.stringify(result)}`);
  }
  const archway = validateEnquiry({ ...valid, villa: 'villa-archway', guests: '20' }, '2026-11-26');
  assert.ok('enquiry' in archway);
});

test('line breaks cannot be smuggled into email headers', () => {
  const result = validateEnquiry({ ...valid, name: 'Riya\r\nBcc: victim@example.com' }, '2026-11-26');
  assert.ok('enquiry' in result);
  const message = composeEnquiryEmail(result.enquiry, 'owner@example.com', 'owner@example.com');
  assert.equal(/[\r\n]/.test(message.subject), false);
  assert.equal(/[\r\n]/.test(message.from), false);
});

test('bots filling the hidden field are told it worked, but nothing is sent', async () => {
  let sent = 0;
  const response = await enquiryResponse(post({ ...valid, website: 'http://spam.example' }), client(), { env, now, sendMail: async () => { sent++; }, checkDates: async () => null });
  assert.equal(response.status, 200);
  assert.equal(sent, 0);
});

test('without Gmail settings the site reports email as unavailable, so the copy fallback is offered', async () => {
  const response = await enquiryResponse(post(valid), client(), { env: {}, now, checkDates: async () => null });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).status, 'unavailable');
});

test('a failed send is reported without leaking details', async () => {
  const response = await enquiryResponse(post(valid), client(), { env, now, sendMail: async () => { throw new Error('535 bad password abcd efgh'); }, checkDates: async () => null });
  assert.equal(response.status, 502);
  assert.equal(JSON.stringify(await response.json()).includes('abcd'), false);
});

test('a calendar outage does not lose the enquiry', async () => {
  let sent = 0;
  const response = await enquiryResponse(post(valid), client(), { env, now, sendMail: async () => { sent++; }, checkDates: async () => { throw new Error('calendar down'); } });
  assert.equal(response.status, 200);
  assert.equal(sent, 1);
});

test('malformed, oversized and non-POST requests are rejected; senders are rate limited', async () => {
  const deps = { env, now, sendMail: async () => {}, checkDates: async () => null };
  assert.equal((await enquiryResponse(post('not json'), client(), deps)).status, 400);
  assert.equal((await enquiryResponse(post([1, 2]), client(), deps)).status, 400);
  assert.equal((await enquiryResponse(post({ ...valid, message: 'x'.repeat(20000) }), client(), deps)).status, 413);
  assert.equal((await enquiryResponse(new Request('http://localhost/api/enquiry/'), client(), deps)).status, 405);
  const same = client();
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await enquiryResponse(post(valid), same, deps)).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
});
