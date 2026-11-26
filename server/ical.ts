import { zonedInstant, type CalendarEvent } from '../src/lib/availability-rules';

// Reads the events from a Google Calendar "Secret address in iCal format" feed (RFC 5545).
// Only what availability needs is kept: title, status, start and end.

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function unescapeText(value: string): string {
  return value.replace(/\\([\;,nN])/g, (_, char: string) => (char === 'n' || char === 'N' ? '\n' : char));
}

type Property = { params: Record<string, string>; value: string };

function parseLine(line: string): [string, Property] | null {
  const colon = line.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  if (colon < 0) return null;
  const [name, ...params] = line.slice(0, colon).split(';');
  const parsed: Record<string, string> = {};
  for (const param of params) {
    const equals = param.indexOf('=');
    if (equals > 0) parsed[param.slice(0, equals).toUpperCase()] = param.slice(equals + 1).replace(/^"|"$/g, '');
  }
  return [name.toUpperCase(), { params: parsed, value: line.slice(colon + 1) }];
}

function toEventTime(property: Property, timeZone: string): { date?: string; dateTime?: string } {
  const { value, params } = property;
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (dateOnly || params.VALUE === 'DATE') {
    if (!dateOnly) throw new Error('Invalid iCal date');
    return { date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}` };
  }
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!match) throw new Error('Invalid iCal date-time');
  const [, year, month, day, hour, minute, second, utc] = match;
  const date = `${year}-${month}-${day}`;
  const time = `${hour}:${minute}:${second}`;
  if (utc) return { dateTime: `${date}T${time}Z` };
  // Local times use their own TZID, or the property's timezone when none is given.
  let zone = params.TZID || timeZone;
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(); } catch { zone = timeZone; }
  return { dateTime: zonedInstant(date, time, zone) };
}

export function parseIcal(text: string, timeZone: string): CalendarEvent[] {
  const lines = unfold(text);
  if (!lines.some(line => line.trim() === 'BEGIN:VCALENDAR')) throw new Error('Not an iCal feed');
  const events: CalendarEvent[] = [];
  let current: Record<string, Property> | null = null;
  let depth = 0; // nested components such as VALARM inside a VEVENT
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === 'BEGIN:VEVENT') { current = {}; depth = 0; continue; }
    if (!current) continue;
    if (line.startsWith('BEGIN:')) { depth++; continue; }
    if (line.startsWith('END:') && line !== 'END:VEVENT') { depth = Math.max(0, depth - 1); continue; }
    if (line === 'END:VEVENT') {
      const start = current.DTSTART;
      if (!start) throw new Error('Event without a start');
      const startTime = toEventTime(start, timeZone);
      let endTime: { date?: string; dateTime?: string };
      if (current.DTEND) endTime = toEventTime(current.DTEND, timeZone);
      else if (startTime.date) {
        // An all-day event without DTEND lasts one day.
        const next = new Date(`${startTime.date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
        endTime = { date: next.toISOString().slice(0, 10) };
      } else endTime = startTime;
      if (startTime.date && endTime.dateTime) endTime = { date: endTime.dateTime.slice(0, 10) };
      if (startTime.dateTime && endTime.date) endTime = { dateTime: zonedInstant(endTime.date, '00:00:00', timeZone) };
      events.push({
        status: current.STATUS?.value.toUpperCase() === 'CANCELLED' ? 'cancelled' : 'confirmed',
        summary: current.SUMMARY ? unescapeText(current.SUMMARY.value) : undefined,
        start: startTime, end: endTime,
      });
      current = null;
      continue;
    }
    if (depth > 0) continue;
    const parsed = parseLine(line);
    if (parsed && !(parsed[0] in current)) current[parsed[0]] = parsed[1];
  }
  return events;
}
