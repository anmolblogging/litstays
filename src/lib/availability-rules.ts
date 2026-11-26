export type UnavailableRange = { start: string; end: string };
export type AvailabilityData = {
  status: 'ok' | 'demo';
  unavailable: UnavailableRange[];
  range: { from: string; to: string };
  timeZone: string;
  minStayNights: number;
  refreshedAt: string;
  refreshAfterSeconds: number;
};
export type CalendarEvent = {
  status?: string;
  summary?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

// One shared Google Calendar holds every villa's bookings. An event belongs to a
// villa when its title contains that villa's name, e.g. "Archway – Sharma family".
export const villaCalendarNames = { 'villa-archway': 'Archway', 'villa-avante': 'Avante', 'villa-aurania': 'Aurania' } as const;
export type VillaSlug = keyof typeof villaCalendarNames;

export function isVillaSlug(value: string): value is VillaSlug {
  return Object.hasOwn(villaCalendarNames, value);
}

export function eventsForVilla(events: CalendarEvent[], villa: VillaSlug): CalendarEvent[] {
  const name = new RegExp(`\\b${villaCalendarNames[villa]}\\b`, 'i');
  return events.filter(event => name.test(event.summary ?? ''));
}

export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

export function addDays(value: string, amount: number): string {
  if (!validDate(value)) throw new Error('Invalid date');
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000);
}

export function dateInZone(instant: number | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const get = (type: string) => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Convert a property-local date boundary to an instant, including DST offsets.
export function zonedMidnight(date: string, timeZone: string): string {
  return zonedInstant(date, '00:00:00', timeZone);
}

// Convert a property-local date and time (HH:MM:SS) to an instant, including DST offsets.
export function zonedInstant(date: string, time: string, timeZone: string): string {
  if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time)) throw new Error('Invalid date');
  const target = Date.parse(`${date}T${time}Z`);
  let instant = target;
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let attempt = 0; attempt < 5; attempt++) {
    const parts = formatter.formatToParts(instant);
    const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
    const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    const correction = target - asUTC;
    if (correction === 0) return new Date(instant).toISOString();
    instant += correction;
  }
  // Never silently shift a nonexistent local boundary into a different day.
  throw new Error('Unsupported local date boundary');
}

export function mergeRanges(ranges: UnavailableRange[]): UnavailableRange[] {
  const sorted = ranges.map(range => ({ ...range })).sort((a, b) => a.start.localeCompare(b.start));
  const merged: UnavailableRange[] = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) previous.end = range.end > previous.end ? range.end : previous.end;
    else merged.push(range);
  }
  return merged;
}

export function normalizeEvents(events: CalendarEvent[], timeZone: string, from: string, to: string): UnavailableRange[] {
  const ranges: UnavailableRange[] = [];
  for (const event of events) {
    if (event.status === 'cancelled') continue;
    let start: string;
    let end: string;
    if (event.start?.date && event.end?.date) {
      start = event.start.date;
      if (!validDate(start) || !validDate(event.end.date) || event.end.date <= start) throw new Error('Invalid all-day event');
      // Google stores the day after the last shown day. The last shown day is the checkout.
      end = addDays(event.end.date, -1);
    } else if (event.start?.dateTime && event.end?.dateTime) {
      if (![event.start.dateTime, event.end.dateTime].every(value => /(?:Z|[+-]\d{2}:\d{2})$/.test(value))) throw new Error('Missing timezone offset');
      const first = Date.parse(event.start.dateTime);
      const last = Date.parse(event.end.dateTime);
      if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) throw new Error('Invalid timed event');
      start = dateInZone(first, timeZone);
      // Only dates matter, not hours: the date the event ends on is the checkout.
      end = dateInZone(last, timeZone);
    } else throw new Error('Incomplete calendar event');
    // Check-in to checkout blocks the nights in between; the checkout date stays bookable.
    // An event on a single date blocks that one night.
    if (end <= start) end = addDays(start, 1);
    if (end > from && start < to) ranges.push({ start: start < from ? from : start, end: end > to ? to : end });
  }
  return mergeRanges(ranges);
}

export function isUnavailable(date: string, unavailable: UnavailableRange[]): boolean {
  return unavailable.some(range => date >= range.start && date < range.end);
}

export function stayError(checkIn: string, checkOut: string, unavailable: UnavailableRange[], minimumNights = 0): string | null {
  if (!validDate(checkIn) || !validDate(checkOut) || checkOut <= checkIn) return 'Choose a check-out date after check-in.';
  if (minimumNights > 0 && nightsBetween(checkIn, checkOut) < minimumNights) return `Please choose at least ${minimumNights} nights.`;
  if (unavailable.some(range => checkIn < range.end && checkOut > range.start)) return 'Those dates include an unavailable night. Please choose another stay.';
  return null;
}

export function demoAvailability(from: string, to: string, now = new Date()): AvailabilityData {
  const unavailable: UnavailableRange[] = [];
  const cursor = new Date(`${from.slice(0, 7)}-01T12:00:00Z`);
  while (cursor.toISOString().slice(0, 10) < to) {
    const month = cursor.toISOString().slice(0, 7);
    for (const [start, end] of [[12, 15], [21, 23]]) unavailable.push({ start: `${month}-${start}`, end: `${month}-${end}` });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return {
    status: 'demo', unavailable: mergeRanges(unavailable.filter(range => range.end > from && range.start < to).map(range => ({ start: range.start < from ? from : range.start, end: range.end > to ? to : range.end }))),
    range: { from, to }, timeZone: 'Asia/Kolkata', minStayNights: 0, refreshedAt: now.toISOString(), refreshAfterSeconds: 60,
  };
}
