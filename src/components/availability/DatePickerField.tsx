'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { addDays, dateInZone, isUnavailable, stayError, type UnavailableRange, type VillaSlug } from '@/lib/availability-rules';
import { fetchAvailability } from '@/lib/availability-client';

const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const zone = 'Asia/Kolkata';

function shiftMonth(month: string, amount: number) {
  const date = new Date(`${month}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}
function monthLabel(month: string) { return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`)); }
function longDate(date: string) { return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)); }
export function shortDate(date: string) { return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)); }
function monthCells(month: string) {
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + length) / 7) * 7 }, (_, i) => i < offset || i >= offset + length ? null : `${month}-${String(i - offset + 1).padStart(2, '0')}`);
}

type Props = {
  villa: VillaSlug | '';
  mode: 'checkIn' | 'checkOut';
  checkIn: string;
  checkOut: string;
  onSelect: (date: string) => void;
  name: string;
  placeholder: string;
  label: string;
};

// A date field whose calendar crosses out the nights already booked for the chosen villa.
export function DatePickerField({ villa, mode, checkIn, checkOut, onSelect, name, placeholder, label }: Props) {
  const value = mode === 'checkIn' ? checkIn : checkOut;
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState('');
  const [month, setMonth] = useState('');
  const [loaded, setLoaded] = useState<{ key: string; unavailable: UnavailableRange[]; sample: boolean; failed: boolean }>({ key: '', unavailable: [], sample: false, failed: false });
  const wrapper = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const openPicker = useCallback(() => {
    const now = dateInZone(Date.now(), zone);
    setToday(now);
    const anchor = value || (mode === 'checkOut' && checkIn ? checkIn : now);
    setMonth(anchor.slice(0, 7));
    setOpen(true);
  }, [value, mode, checkIn]);
  const close = useCallback((focusTrigger = true) => { setOpen(false); if (focusTrigger) trigger.current?.focus(); }, []);

  // Load the booked nights for the visible month (plus the first days of the next, for checkouts).
  const key = open && month && villa ? `${villa}/${month}` : '';
  useEffect(() => {
    if (!key || !villa) return;
    const controller = new AbortController();
    fetchAvailability(`${month}-01`, `${shiftMonth(month, 1)}-08`, { villa, signal: controller.signal })
      .then(data => setLoaded({ key, unavailable: data.unavailable, sample: data.status === 'demo', failed: false }))
      .catch(() => { if (!controller.signal.aborted) setLoaded({ key, unavailable: [], sample: false, failed: true }); });
    return () => controller.abort();
  }, [key, villa, month]);
  const phase = !key ? 'idle' : loaded.key !== key ? 'loading' : loaded.failed ? 'error' : 'ready';
  const unavailable = loaded.key === key ? loaded.unavailable : [];
  const isSample = loaded.key === key && loaded.sample;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) close(false); };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open, close]);

  function dayState(date: string) {
    const past = date < today;
    const booked = isUnavailable(date, unavailable);
    if (mode === 'checkIn') return { disabled: past || booked || phase !== 'ready', booked };
    // A checkout is allowed when every night from check-in up to it is free; the checkout day itself may be booked.
    if (!checkIn) return { disabled: past || date <= today || phase !== 'ready', booked };
    const ok = date > checkIn && stayError(checkIn, date, unavailable) === null;
    return { disabled: !ok || phase !== 'ready', booked: booked && !ok };
  }

  function choose(date: string) {
    onSelect(date);
    close();
  }

  function onGridKey(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const date = target.dataset.date;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (!date) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = addDays(date, step);
    if (next.slice(0, 7) !== month) setMonth(next.slice(0, 7));
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus());
  }

  const cells = month ? monthCells(month) : [];
  const status = !villa ? 'Choose a villa to see its booked dates.'
    : phase === 'loading' ? 'Checking dates…'
    : phase === 'error' ? 'We couldn’t load the dates. Please try again.'
    : mode === 'checkOut' && checkIn ? `Check-in ${shortDate(checkIn)}. Choose your checkout.`
    : mode === 'checkOut' ? 'Choose your check-in date first for the best results.'
    : 'Crossed-out dates are already booked.';

  return <span className="date-field" ref={wrapper}>
    <input
      ref={trigger} type="text" readOnly inputMode="none" name={name} value={value ? shortDate(value) : ''} placeholder={placeholder}
      aria-label={value ? `${label}: ${longDate(value)}` : label} role="combobox" aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId}
      className="date-trigger" autoComplete="off"
      onClick={() => (open ? close(false) : openPicker())}
      onKeyDown={event => { if (['Enter', ' ', 'ArrowDown'].includes(event.key)) { event.preventDefault(); openPicker(); } else if (event.key === 'Escape' && open) { event.preventDefault(); close(); } }}
    />
    <svg className="date-field-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>
    {open && <div id={panelId} className="date-panel" role="dialog" aria-label={`${label} calendar`}>
      <div className="date-panel-head">
        <button type="button" aria-label="Previous month" disabled={!today || month <= today.slice(0, 7)} onClick={() => setMonth(current => shiftMonth(current, -1))}>‹</button>
        <strong aria-live="polite">{monthLabel(month)}</strong>
        <button type="button" aria-label="Next month" disabled={!today || month >= shiftMonth(today.slice(0, 7), 24)} onClick={() => setMonth(current => shiftMonth(current, 1))}>›</button>
      </div>
      <div className="date-panel-grid" role="grid" ref={grid} onKeyDown={onGridKey}>
        {weekdays.map(day => <span key={day} className="date-panel-weekday" role="columnheader">{day}</span>)}
        {cells.map((date, index) => {
          if (!date) return <span key={`blank-${index}`} aria-hidden="true"/>;
          const { disabled, booked } = villa ? dayState(date) : { disabled: true, booked: false };
          const selected = date === checkIn || date === checkOut;
          const inRange = !!checkIn && !!checkOut && date > checkIn && date < checkOut;
          return <button
            key={date} type="button" role="gridcell" data-date={date} disabled={disabled}
            className={`date-day${booked ? ' is-booked' : ''}${selected ? ' is-selected' : ''}${inRange ? ' is-range' : ''}${date === today ? ' is-today' : ''}`}
            aria-label={`${longDate(date)}${booked ? ', booked' : disabled ? ', not available' : ''}`} aria-selected={selected}
            tabIndex={date === (value || today) || (!value && date === `${month}-01`) ? 0 : -1}
            onClick={() => choose(date)}
          >{Number(date.slice(8))}</button>;
        })}
      </div>
      <p className="date-panel-status" role="status">{status}</p>
      <p className="date-panel-legend"><span className="date-legend-booked">12</span> Booked{isSample ? ' · sample dates' : ''}</p>
    </div>}
  </span>;
}
