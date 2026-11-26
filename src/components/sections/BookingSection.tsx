'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { site } from '@/lib/site-content';
import Image from 'next/image';
import { Arrow } from '../ui/Icons';
import { Reveal } from '../ui/Reveal';
import { useStay } from '../availability/StayProvider';
import { DatePickerField } from '../availability/DatePickerField';
import { fetchAvailability } from '@/lib/availability-client';
import { dateInZone, isVillaSlug, stayError } from '@/lib/availability-rules';
import { villaOption, villaOptions } from '@/lib/villa-options';
import { sendEnquiry } from '@/lib/enquiry-client';

type Enquiry = { name: string; contact: string; villa: string; checkIn: string; checkOut: string; guests: string; budget: string; food: string; message: string; website: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}
function villaName(slug: string) { return villaOption(slug)?.name ?? 'The LIT Stays'; }
function enquiryMessage(data: Enquiry) {
  return `Hello The LIT Stays, I’d love to enquire about ${villaName(data.villa)}.\n\nName: ${data.name}\nContact: ${data.contact}\nCheck-in: ${formatDate(data.checkIn)}\nCheck-out: ${formatDate(data.checkOut)}\nGuests: ${data.guests}\nApproximate budget: ${data.budget}\nFood preference: ${data.food}${data.message ? `\n\n${data.message}` : ''}\n\nPlease share availability, pricing and any details for our stay. Thank you!`;
}

export function BookingSection() {
  const { dates, setDates, guests, setGuests, villa, setVilla } = useStay();
  const { checkIn, checkOut } = dates;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<Enquiry | null>(null);
  const [sent, setSent] = useState<Enquiry | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const submit = useRef<HTMLButtonElement>(null);
  const preview = useRef<HTMLTextAreaElement>(null);
  const thanks = useRef<HTMLDivElement>(null);
  const capacity = villaOption(villa)?.capacity ?? Math.max(...villaOptions.map(option => option.capacity));
  useEffect(() => {
    if (!reviewOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [reviewOpen]);
  useEffect(() => { if (sent) thanks.current?.focus(); }, [sent]);
  function close() { dialog.current?.close(); setReviewOpen(false); submit.current?.focus(); }
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Partial<Enquiry>;
    const enquiry: Enquiry = {
      name: String(values.name || '').trim(), contact: String(values.contact || '').trim(), villa, checkIn, checkOut,
      guests: String(values.guests || ''), budget: String(values.budget || ''), food: String(values.food || ''),
      message: String(values.message || '').trim(), website: String(values.website || ''),
    };
    if (!enquiry.name) { setError('Please tell us your name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiry.contact) && !/^\+?[\d\s().-]{7,22}$/.test(enquiry.contact)) { setError('Please enter a valid email address or phone number.'); form.current?.querySelector<HTMLInputElement>('[name="contact"]')?.focus(); return; }
    if (!isVillaSlug(villa)) { setError('Please choose a villa.'); form.current?.querySelector<HTMLSelectElement>('[name="villa"]')?.focus(); return; }
    if (!checkIn || !checkOut) { setError('Please choose your check-in and check-out dates.'); return; }
    if (checkOut <= checkIn) { setError('Check-out needs to be after your check-in date.'); return; }
    if (!Number.isInteger(Number(enquiry.guests)) || Number(enquiry.guests) < 1) { setError('Please enter a whole number of guests, starting from one.'); return; }
    if (Number(enquiry.guests) > capacity) { setError(`${villaName(villa)} accommodates up to ${capacity} guests.`); return; }
    if (!enquiry.budget) { setError('Please choose an approximate budget.'); return; }
    if (!enquiry.food) { setError('Please choose a food preference.'); return; }
    setSubmitting(true);
    try {
      try {
        const availability = await fetchAvailability(checkIn, checkOut, { villa, fresh: true });
        if (checkIn < dateInZone(Date.now(), availability.timeZone)) { setError('Please choose a check-in date from today onwards.'); return; }
        const conflict = stayError(checkIn, checkOut, availability.unavailable, availability.minStayNights);
        if (conflict) { setError(conflict); return; }
      } catch { /* The server checks the dates again before emailing. */ }
      const result = await sendEnquiry(enquiry);
      if (result.status === 'sent') { setSent(enquiry); form.current?.reset(); setDates({ checkIn: '', checkOut: '' }); setGuests(''); return; }
      if (result.status === 'rejected') { setError(result.message); return; }
      // Email couldn't be sent: fall back to copying the message to Instagram/WhatsApp.
      setData(enquiry); setCopied(false); setReviewOpen(true); dialog.current?.showModal();
    } finally { setSubmitting(false); }
  }
  async function copyMessage() {
    if (!data) return;
    setCopying(true);
    try { await navigator.clipboard.writeText(enquiryMessage(data)); setCopied(true); }
    catch { preview.current?.focus(); preview.current?.select(); setCopied(false); }
    finally { setCopying(false); }
  }
  const text = data ? enquiryMessage(data) : '';
  const destination = site.contact.whatsapp
    ? `https://wa.me/${site.contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
    : site.contact.email
      ? `mailto:${site.contact.email}?subject=${encodeURIComponent(`${villaName(data?.villa ?? '')} stay enquiry`)}&body=${encodeURIComponent(text)}`
      : site.instagramMessage;
  const channel = site.contact.whatsapp ? 'WhatsApp' : site.contact.email ? 'email' : 'Instagram';
  return <section className="booking section-padding" id="enquire" aria-labelledby="booking-heading">
    <Reveal className="booking-title"><h2 id="booking-heading">Your next escape starts <em>here.</em></h2></Reveal>
    <div className="booking-intro"><Reveal><h3 className="booking-form-heading">Tell us what you have <em>in mind.</em></h3><p>A few days away. Your favourite people. Share the basics and we’ll get back to you with availability and pricing.</p><Image className="booking-intro-image" src="/images/enquiry-pool.jpg" alt="Friends relaxing by the private pool at The LIT Stays, Virar" width={1000} height={1000} sizes="(max-width: 800px) 100vw, 36vw" unoptimized/></Reveal></div>
    <Reveal className="booking-form-wrap"><noscript><style>{`.booking-form { display: none; }`}</style><p>Tell us your dates and group size on Instagram to enquire about your stay.</p><a className="button button-ivory" href={site.instagramMessage}>Enquire on Instagram <Arrow diagonal/></a></noscript>
      {sent ? <div className="booking-sent" ref={thanks} tabIndex={-1} role="status">
        <h3>Thank you, {sent.name}.</h3>
        <p>Your enquiry for {villaName(sent.villa)}, {formatDate(sent.checkIn)} to {formatDate(sent.checkOut)}, has been sent. We’ll get back to you soon with availability and pricing.</p>
        <button type="button" className="text-link" onClick={() => setSent(null)}>Send another enquiry <Arrow diagonal/></button>
      </div> : <form ref={form} onSubmit={prepare} className="booking-form" noValidate>
        <div className="form-row"><label>Your name<input name="name" autoComplete="name" placeholder="What should we call you?" maxLength={100} required/></label><label>Email or phone<input name="contact" autoComplete="email" placeholder="Let’s keep in touch" maxLength={150} required/></label></div>
        <div className="form-row"><label>Villa<select name="villa" value={villa} onChange={event => {
          const next = event.target.value;
          if (!isVillaSlug(next)) return;
          setVilla(next); setDates({ checkIn: '', checkOut: '' });
          if (Number(guests) > (villaOption(next)?.capacity ?? 0)) setGuests('');
        }} required><option value="" disabled>Choose a villa</option>{villaOptions.map(option => <option key={option.slug} value={option.slug}>{option.name}</option>)}</select></label><label>Number of guests<input name="guests" value={guests} onChange={event => setGuests(event.target.value)} type="number" inputMode="numeric" min="1" max={capacity} step="1" placeholder="Your good company" required/></label></div>
        <div className="form-row">
          <div className="booking-date"><span className="booking-date-label">Check-in</span><DatePickerField villa={villa} mode="checkIn" checkIn={checkIn} checkOut={checkOut} name="checkIn" placeholder="Choose a date" label="Check-in date" onSelect={date => setDates(current => ({ checkIn: date, checkOut: current.checkOut > date ? current.checkOut : '' }))}/></div>
          <div className="booking-date"><span className="booking-date-label">Check-out</span><DatePickerField villa={villa} mode="checkOut" checkIn={checkIn} checkOut={checkOut} name="checkOut" placeholder="Choose a date" label="Check-out date" onSelect={date => setDates(current => ({ ...current, checkOut: date }))}/></div>
        </div>
        <label>Approximate budget<select name="budget" defaultValue="" required><option value="" disabled>Select a range</option><option>₹10,000 – ₹25,000</option><option>₹25,000 – ₹50,000</option><option>₹50,000 – ₹75,000</option><option>₹75,000 – ₹1,00,000</option><option>Above ₹1,00,000</option></select></label>
        <fieldset className="food-choice"><legend>Food preference</legend><div>{['Veg', 'Non-Veg', 'Jain'].map(option => <label key={option}><input type="radio" name="food" value={option} required/><span>{option}</span></label>)}</div></fieldset>
        <label>A little about your plans <span className="optional">(optional)</span><textarea name="message" rows={2} maxLength={1500} placeholder="A celebration, a quiet weekend, or just because…"/></label>
        <label className="booking-trap" aria-hidden="true">Leave this empty<input name="website" tabIndex={-1} autoComplete="off"/></label>
        <p className="form-error" role="alert" id="enquiry-error">{error}</p>
        <button ref={submit} className="button button-ivory form-submit" type="submit" disabled={submitting} aria-describedby="enquiry-error">{submitting ? 'Sending your enquiry…' : 'Send my enquiry'} <Arrow diagonal/></button>
      </form>}
    </Reveal>

    <dialog className="enquiry-dialog" ref={dialog} aria-labelledby="enquiry-dialog-heading" onCancel={close}><button className="dialog-close" onClick={close} aria-label="Close enquiry preview">×</button><h2 id="enquiry-dialog-heading">Let’s make <em>plans.</em></h2><p>We couldn’t send your enquiry automatically. Copy your message below, then send it to us on {channel}.</p><label htmlFor="enquiry-preview" className="sr-only">Your enquiry message</label><textarea ref={preview} id="enquiry-preview" value={text} readOnly rows={9}/><div className="enquiry-dialog-actions"><button className="button button-green" onClick={copyMessage} disabled={copying}>{copying ? 'Copying…' : copied ? 'Message copied' : 'Copy enquiry'}<span aria-hidden="true">{copied ? '✓' : '↗'}</span></button><a className="text-link dark-link" href={destination} target="_blank" rel="noopener noreferrer">Continue on {channel} <Arrow diagonal/></a></div><p className="copy-status" role="status">{copied ? `Ready to paste into your ${channel} conversation.` : 'You can also select and copy the message yourself.'}</p></dialog>
  </section>;
}
