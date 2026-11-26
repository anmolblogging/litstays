import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, eventsForVilla, isUnavailable, normalizeEvents, stayError, validDate, zonedMidnight, type CalendarEvent } from '../src/lib/availability-rules';
import { createAvailabilityService, readAvailabilityConfig, AvailabilityError, type AvailabilityConfig } from '../server/availability-service';
import { availabilityResponse } from '../server/availability-api';
import { fetchLiveAvailability } from '../src/lib/availability-client';

const config: AvailabilityConfig = { mode: 'google', calendarId: 'private-calendar', timeZone: 'Asia/Kolkata', cacheSeconds: 60, refreshSeconds: 60, timeoutMs: 8000, minimumNights: 0 };
const block = (start: string, end: string): CalendarEvent => ({ status: 'confirmed', start: { date: start }, end: { date: end } });
// An all-day event as the owner sees it in Google Calendar, e.g. 28–30 Nov. Google stores the end as the next day.
const stay = (checkIn: string, checkOut: string): CalendarEvent => block(checkIn, addDays(checkOut, 1));
const normalize = (events: CalendarEvent[]) => normalizeEvents(events, 'Asia/Kolkata', '2026-11-01', '2027-01-01');

test('calendar dates are validated rather than normalized into a different month', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
});

test('an event shown as 12–15 Nov occupies nights 12, 13 and 14; checkout day 15 is free', () => {
  const ranges = normalize([stay('2026-11-12', '2026-11-15')]);
  for (const date of ['2026-11-12', '2026-11-13', '2026-11-14']) assert.equal(isUnavailable(date, ranges), true);
  assert.equal(isUnavailable('2026-11-15', ranges), false);
  assert.equal(stayError('2026-11-15', '2026-11-17', ranges), null);
  assert.equal(stayError('2026-11-10', '2026-11-12', ranges), null);
  assert.match(stayError('2026-11-11', '2026-11-16', ranges)!, /unavailable/);
});

test('consecutive reservations merge without freeing the next reservation’s check-in night', () => {
  const ranges = normalize([stay('2026-11-12', '2026-11-15'), stay('2026-11-15', '2026-11-18')]);
  assert.deepEqual(ranges, [{ start: '2026-11-12', end: '2026-11-18' }]);
  assert.match(stayError('2026-11-15', '2026-11-16', ranges)!, /unavailable/);
  assert.equal(stayError('2026-11-18', '2026-11-19', ranges), null);
});

test('owner blocks and maintenance are unavailable regardless of title or transparency', () => {
  const events = [{ ...stay('2026-11-02', '2026-11-04'), summary: 'OWNER BLOCK', transparency: 'transparent' }, { ...stay('2026-11-07', '2026-11-07'), summary: 'MAINTENANCE' }];
  const ranges = normalize(events);
  assert.equal(isUnavailable('2026-11-03', ranges), true);
  assert.equal(isUnavailable('2026-11-07', ranges), true);
  assert.equal(isUnavailable('2026-11-08', ranges), false);
});

test('month-spanning events keep their checkout date free', () => {
  const ranges = normalize([stay('2026-11-30', '2026-12-03')]);
  assert.equal(isUnavailable('2026-12-02', ranges), true);
  assert.equal(isUnavailable('2026-12-03', ranges), false);
});

test('timed events use only property-local dates: the end date is the checkout', () => {
  const event = { start: { dateTime: '2026-11-11T18:30:00Z' }, end: { dateTime: '2026-11-14T18:30:00Z' } };
  assert.deepEqual(normalize([event]), [{ start: '2026-11-12', end: '2026-11-15' }]);
  assert.deepEqual(normalize([{ start: { dateTime: '2026-11-11T20:00:00Z' }, end: { dateTime: '2026-11-12T20:00:00Z' } }]), [{ start: '2026-11-12', end: '2026-11-13' }]);
  assert.deepEqual(normalize([{ start: { dateTime: '2026-11-12T04:00:00Z' }, end: { dateTime: '2026-11-12T08:00:00Z' } }]), [{ start: '2026-11-12', end: '2026-11-13' }]);
});

test('DST changes query boundaries without changing calendar-night arithmetic', () => {
  const start = zonedMidnight('2026-03-08', 'America/New_York');
  const end = zonedMidnight('2026-03-09', 'America/New_York');
  assert.equal(start, '2026-03-08T05:00:00.000Z');
  assert.equal(end, '2026-03-09T04:00:00.000Z');
  assert.equal((Date.parse(end) - Date.parse(start)) / 3600000, 23);
  assert.equal(zonedMidnight('2026-11-12', 'Asia/Kolkata'), '2026-11-11T18:30:00.000Z');
});

test('cancelled events are removed; no minimum stay is invented', () => {
  assert.deepEqual(normalize([{ ...stay('2026-11-12', '2026-11-15'), status: 'cancelled' }]), []);
  assert.equal(stayError('2026-11-12', '2026-11-13', []), null);
  assert.match(stayError('2026-11-12', '2026-11-13', [], 3)!, /at least 3 nights/);
  assert.match(stayError('2026-11-12', '2026-11-12', [])!, /after check-in/);
});

test('empty calendars are available only after a successful upstream response', async () => {
  const service = createAvailabilityService(config, { requestPage: async () => ({ items: [] }) });
  const result = await service.get('2026-11-01', '2026-12-01');
  assert.equal(result.status, 'ok'); assert.deepEqual(result.unavailable, []);
});

test('recurrences are expanded, pages are collected, and private fields are never returned', async () => {
  const calls: Record<string, string>[] = [];
  const service = createAvailabilityService(config, { requestPage: async params => {
    calls.push(params);
    return params.pageToken ? { items: [block('2026-11-19', '2026-11-20')] } : { items: [block('2026-11-12', '2026-11-13')], nextPageToken: 'page-two' };
  } });
  const result = await service.get('2026-11-01', '2026-12-01');
  assert.equal(calls.length, 2); assert.equal(calls[0].singleEvents, 'true'); assert.equal(calls[0].showDeleted, 'false');
  assert.equal(calls[0].fields, 'items(status,summary,start,end),nextPageToken');
  assert.equal(calls[0].timeMin, '2026-10-31T18:30:00.000Z');
  assert.equal(result.unavailable.length, 2); assert.equal(JSON.stringify(result).includes('private-calendar'), false);
});

test('short cache expires, and an enquiry refresh bypasses even a fresh cache', async () => {
  let now = 1000; let calls = 0;
  const service = createAvailabilityService(config, { now: () => now, requestPage: async () => { calls++; return { items: [] }; } });
  await service.get('2026-11-01', '2026-12-01'); await service.get('2026-11-01', '2026-12-01');
  assert.equal(calls, 1);
  await service.get('2026-11-01', '2026-12-01', true); assert.equal(calls, 2);
  now += 61000;
  await service.get('2026-11-01', '2026-12-01'); assert.equal(calls, 3);
});

test('a failed refresh never serves stale availability; recovery performs a new request', async () => {
  let now = 1000; let failed = false; let calls = 0;
  const service = createAvailabilityService(config, { now: () => now, requestPage: async () => { calls++; if (failed) throw new Error('sensitive upstream error'); return { items: [] }; } });
  await service.get('2026-11-01', '2026-12-01'); now += 61000; failed = true;
  await assert.rejects(service.get('2026-11-01', '2026-12-01'), (error: AvailabilityError) => error.code === 'UPSTREAM_UNAVAILABLE' && !error.message.includes('sensitive'));
  failed = false; await service.get('2026-11-01', '2026-12-01'); assert.equal(calls, 3);
});

test('authentication errors, rate limits and timeouts produce closed, sanitized failures', async () => {
  for (const status of [401, 403, 429, 500]) {
    const service = createAvailabilityService(config, { requestPage: async () => { throw { response: { status }, message: 'PRIVATE KEY must not leak' }; } });
    await assert.rejects(service.get('2026-11-01', '2026-12-01'), (error: AvailabilityError) => error.code === (status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_UNAVAILABLE') && !error.message.includes('PRIVATE'));
  }
  const timedOut = createAvailabilityService(config, { requestPage: async () => { throw new DOMException('Timed out', 'TimeoutError'); } });
  await assert.rejects(timedOut.get('2026-11-01', '2026-12-01'), AvailabilityError);
});

test('live mode without credentials fails rather than returning an empty or dummy calendar', async () => {
  const service = createAvailabilityService(config);
  await assert.rejects(service.get('2026-11-01', '2026-12-01'), (error: AvailabilityError) => error.code === 'NOT_CONFIGURED');
  assert.throws(() => readAvailabilityConfig({ NODE_ENV: 'test', PROPERTY_TIMEZONE: 'not-a-timezone' }), AvailabilityError);
});

test('public endpoint validates bounds and clearly identifies demo dates', async () => {
  const invalid = await availabilityResponse(new URL('http://localhost/api/availability?villa=villa-archway&from=2026-02-30&to=2026-04-01'));
  assert.equal(invalid.status, 400);
  const demo = await availabilityResponse(new URL('http://localhost/api/availability?villa=villa-archway&from=2026-11-01&to=2026-12-01'));
  const body = await demo.json(); assert.equal(body.status, 'demo');
  assert.equal(body.unavailable[0].start, '2026-11-12');
  assert.equal(demo.headers.get('cache-control'), 'no-store');
  assert.equal(JSON.stringify(body).includes('calendarId'), false);
  for (const villa of ['', 'villa-unknown', 'constructor']) {
    const response = await availabilityResponse(new URL(`http://localhost/api/availability?villa=${villa}&from=2026-11-01&to=2026-12-01`));
    assert.equal(response.status, 400);
  }
});

const titled = (summary: string | undefined, start: string, end: string): CalendarEvent => ({ ...block(start, end), summary });

test('one shared calendar: an event blocks only the villa named in its title', () => {
  const events = [titled('Archway', '2026-11-28', '2026-12-01'), titled('avante – Sharma family', '2026-11-05', '2026-11-07'), titled('AURANIA owner stay', '2026-11-10', '2026-11-11')];
  assert.deepEqual(eventsForVilla(events, 'villa-archway').map(event => event.start?.date), ['2026-11-28']);
  assert.deepEqual(eventsForVilla(events, 'villa-avante').map(event => event.start?.date), ['2026-11-05']);
  assert.deepEqual(eventsForVilla(events, 'villa-aurania').map(event => event.start?.date), ['2026-11-10']);
});

test('titles naming two villas block both; untitled or unrelated events block none; partial words do not match', () => {
  const events = [titled('Archway + Avante wedding', '2026-11-20', '2026-11-22'), titled(undefined, '2026-11-01', '2026-11-02'), titled('Dentist', '2026-11-03', '2026-11-04'), titled('Archways', '2026-11-08', '2026-11-09')];
  assert.equal(eventsForVilla(events, 'villa-archway').length, 1);
  assert.equal(eventsForVilla(events, 'villa-avante').length, 1);
  assert.equal(eventsForVilla(events, 'villa-aurania').length, 0);
});

test('Archway 28–30 November blocks the nights of 28 and 29 on Archway only; 30 November stays bookable', async () => {
  let calls = 0;
  const service = createAvailabilityService(config, { requestPage: async () => { calls++; return { items: [{ ...stay('2026-11-28', '2026-11-30'), summary: 'Archway' }, { ...stay('2026-11-15', '2026-11-16'), summary: 'Avante' }] }; } });
  const archway = await service.get('2026-11-01', '2026-12-01', false, 'villa-archway');
  for (const date of ['2026-11-28', '2026-11-29']) assert.equal(isUnavailable(date, archway.unavailable), true);
  assert.equal(isUnavailable('2026-11-30', archway.unavailable), false);
  assert.equal(stayError('2026-11-30', '2026-12-01', archway.unavailable), null);
  assert.equal(isUnavailable('2026-11-15', archway.unavailable), false);
  const aurania = await service.get('2026-11-01', '2026-12-01', false, 'villa-aurania');
  assert.deepEqual(aurania.unavailable, []);
  assert.equal(calls, 1);
  assert.equal(JSON.stringify(archway).includes('Archway'), false);
});

test('a timed event is read by dates only, ignoring the hours', async () => {
  const timed: CalendarEvent = { status: 'confirmed', summary: 'Avante', start: { dateTime: '2026-11-28T15:00:00+05:30' }, end: { dateTime: '2026-11-30T10:00:00+05:30' } };
  const service = createAvailabilityService(config, { requestPage: async () => ({ items: [timed] }) });
  const avante = await service.get('2026-11-01', '2026-12-01', false, 'villa-avante');
  assert.deepEqual(avante.unavailable, [{ start: '2026-11-28', end: '2026-11-30' }]);
});

test('a slower earlier request cannot overwrite a newer enquiry refresh', async () => {
  let resolveOlder!: (page: { items: CalendarEvent[] }) => void;
  let calls = 0;
  const service = createAvailabilityService(config, { requestPage: async () => {
    calls++;
    if (calls === 1) return new Promise(resolve => { resolveOlder = resolve; });
    return { items: [block('2026-11-12', '2026-11-15')] };
  } });
  const earlier = service.get('2026-11-01', '2026-12-01');
  const fresh = await service.get('2026-11-01', '2026-12-01', true);
  resolveOlder({ items: [] }); await earlier;
  const cached = await service.get('2026-11-01', '2026-12-01');
  assert.deepEqual(cached.unavailable, fresh.unavailable);
});

test('the complete upstream operation has a deadline even if authentication never resolves', async () => {
  const service = createAvailabilityService({ ...config, timeoutMs: 10 }, { requestPage: () => new Promise(() => {}) });
  await assert.rejects(service.get('2026-11-01', '2026-12-01'), (error: AvailabilityError) => error.code === 'UPSTREAM_UNAVAILABLE');
});

test('live browser requests reject upstream errors and demo responses instead of inventing availability', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{}', { status: 503 });
    await assert.rejects(fetchLiveAvailability('2026-11-01', '2026-12-01', { villa: 'villa-archway' }), /temporarily unavailable/);
    globalThis.fetch = async () => Response.json({ status: 'demo', unavailable: [] });
    await assert.rejects(fetchLiveAvailability('2026-11-01', '2026-12-01', { villa: 'villa-archway' }), /could not be verified/);
    globalThis.fetch = async input => { assert.match(String(input), /fresh=1/); assert.match(String(input), /villa=villa-avante/); return Response.json({ status: 'ok', unavailable: [], range: { from: '2026-11-01', to: '2026-12-01' }, timeZone: 'Asia/Kolkata', minStayNights: 0, refreshAfterSeconds: 60, refreshedAt: new Date().toISOString() }); };
    assert.equal((await fetchLiveAvailability('2026-11-01', '2026-12-01', { villa: 'villa-avante', fresh: true })).status, 'ok');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// Shaped like a Google Calendar "Secret address in iCal format" feed.
const googleFeed = [
  'BEGIN:VCALENDAR', 'PRODID:-//Google Inc//Google Calendar 70.9054//EN', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
  'X-WR-CALNAME:Lit Stays bookings', 'X-WR-TIMEZONE:Asia/Kolkata',
  // Owner sees "Archway, 28–30 Nov" (all day); Google stores DTEND as the next day.
  'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261128', 'DTEND;VALUE=DATE:20261201', 'UID:a1@google.com', 'STATUS:CONFIRMED',
  'SUMMARY:Archway – Sharma family\\, 12 guests', 'TRANSP:TRANSPARENT',
  'BEGIN:VALARM', 'ACTION:DISPLAY', 'SUMMARY:Avante', 'TRIGGER:-P0DT0H30M0S', 'END:VALARM', 'END:VEVENT',
  // Avante 28–29 Nov, entered with times instead of all day (UTC in the feed).
  'BEGIN:VEVENT', 'DTSTART:20261128T083000Z', 'DTEND:20261129T053000Z', 'UID:a2@google.com', 'STATUS:CONFIRMED', 'SUMMARY:Avante', 'END:VEVENT',
  // A long title folded over two lines, with a local TZID time.
  'BEGIN:VEVENT', 'DTSTART;TZID=Asia/Kolkata:20261205T140000', 'DTEND;TZID=Asia/Kolkata:20261207T110000', 'UID:a3@google.com',
  'SUMMARY:Aurania – Mehta birthday weekend with deco', ' ration and dinner', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261110', 'DTEND;VALUE=DATE:20261112', 'UID:a4@google.com', 'STATUS:CANCELLED', 'SUMMARY:Aurania', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261115', 'DTEND;VALUE=DATE:20261116', 'UID:a5@google.com', 'SUMMARY:Dentist', 'END:VEVENT',
  'END:VCALENDAR', '',
].join('\r\n');

const icalConfig: AvailabilityConfig = { ...config, mode: 'ical' };

test('secret iCal link: each villa gets only its own nights, checkout dates stay free', async () => {
  let fetches = 0;
  const service = createAvailabilityService(icalConfig, { fetchFeed: async () => { fetches++; return googleFeed; } });
  const archway = await service.get('2026-11-01', '2027-01-01', false, 'villa-archway');
  const avante = await service.get('2026-11-01', '2027-01-01', false, 'villa-avante');
  const aurania = await service.get('2026-11-01', '2027-01-01', false, 'villa-aurania');
  assert.deepEqual(archway.unavailable, [{ start: '2026-11-28', end: '2026-11-30' }]);
  assert.deepEqual(avante.unavailable, [{ start: '2026-11-28', end: '2026-11-29' }]);
  assert.deepEqual(aurania.unavailable, [{ start: '2026-12-05', end: '2026-12-07' }]);
  assert.equal(archway.status, 'ok');
  assert.equal(fetches, 1);
  for (const result of [archway, avante, aurania]) assert.equal(/Sharma|Mehta|Dentist|Archway|Avante|Aurania/.test(JSON.stringify(result)), false);
});

test('secret iCal link failures are closed and never leak the link', async () => {
  const missing = createAvailabilityService(icalConfig);
  await assert.rejects(missing.get('2026-11-01', '2026-12-01', false, 'villa-archway'), (error: AvailabilityError) => error.code === 'NOT_CONFIGURED');
  const http = createAvailabilityService({ ...icalConfig, icalUrl: 'http://calendar.google.com/calendar/ical/secret/basic.ics' });
  await assert.rejects(http.get('2026-11-01', '2026-12-01', false, 'villa-archway'), (error: AvailabilityError) => error.code === 'NOT_CONFIGURED');
  const broken = createAvailabilityService(icalConfig, { fetchFeed: async () => '<html>Not found https://calendar.google.com/secret</html>' });
  await assert.rejects(broken.get('2026-11-01', '2026-12-01', false, 'villa-archway'), (error: AvailabilityError) => error.code === 'UPSTREAM_UNAVAILABLE' && !error.message.includes('secret'));
  const failing = createAvailabilityService(icalConfig, { fetchFeed: async () => { throw { response: { status: 404 } }; } });
  await assert.rejects(failing.get('2026-11-01', '2026-12-01', false, 'villa-archway'), (error: AvailabilityError) => error.code === 'UPSTREAM_UNAVAILABLE');
});

test('the secret iCal link is read from server configuration only', () => {
  const parsed = readAvailabilityConfig({ AVAILABILITY_MODE: 'ical', GOOGLE_CALENDAR_ICAL_URL: ' https://calendar.google.com/calendar/ical/x/private-y/basic.ics ' });
  assert.equal(parsed.mode, 'ical');
  assert.equal(parsed.icalUrl, 'https://calendar.google.com/calendar/ical/x/private-y/basic.ics');
});
