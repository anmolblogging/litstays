'use client';

import { getImageProps } from 'next/image';
import { useRef } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion, useScroll, useTransform } from 'motion/react';
import villaImageLoader from '@/lib/villa-image-loader';
import { useStay } from '../availability/StayProvider';
import { isVillaSlug } from '@/lib/availability-rules';
import { villaOption, villaOptions } from '@/lib/villa-options';
import { DatePickerField } from '../availability/DatePickerField';
import { VillaHeroSlideshow as HeroSlideshow, type HeroSlide } from '../villas/VillaHeroSlideshow';

const slides: HeroSlide[] = [
  { id: 'home-property-1', src: '/home-hero/home-property-1-1920.webp', alt: 'Villa and surrounding greenery viewed from above', responsive: true },
  { id: 'home-property-2', src: '/home-hero/home-property-2-1920.webp', alt: 'The villa facade and gardens in daylight', responsive: true },
  { id: 'home-property-3', src: '/home-hero/home-property-3-1920.webp', alt: 'Aerial view of the villa courtyard', responsive: true },
  { id: 'home-property-4', src: '/home-hero/home-property-4-1920.webp', alt: 'The villa glowing at dusk among the trees', responsive: true },
  { id: 'home-property-5', src: '/home-hero/home-property-5-1920.webp', alt: 'The villa and treetops in evening light', responsive: true },
];

export function HeroSection() {
  const { dates, setDates, guests, setGuests, villa, setVilla } = useStay();
  const capacity = villaOption(villa)?.capacity ?? Math.max(...villaOptions.map(option => option.capacity));
  const preload = getImageProps({ src: slides[0].src, width: 1536, height: 1024, alt: '', sizes: '100vw', loader: villaImageLoader }).props;
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const opacity = useTransform(scrollYProgress, [0, .55], [1, 0]);
  const y = useTransform(scrollYProgress, [0, .7], [0, -65]);
  return <section id="home" className="hero" ref={ref} aria-labelledby="hero-heading">
    <link rel="preload" as="image" imageSrcSet={preload.srcSet} imageSizes="100vw" fetchPriority="high"/>
    <div id="nav-sentinel"/>
    <div className="hero-sticky">
      <HeroSlideshow name="LIT Stays" slides={slides} variant="home" />
      <div className="hero-shade"/>
      <LazyMotion features={domAnimation}><m.div className="hero-content" style={reduced ? undefined : { opacity, y }}>
        <h1 id="hero-heading">Some places stay <em>with you.</em></h1>
        <p className="hero-description hero-enter">A place to slow down. Room to reconnect. A little time that’s entirely your own.</p>
        <div className="hero-booking hero-enter" role="group" aria-label="Your stay">
          <label>Guests <span className="hero-required" aria-hidden="true">*</span>
            <select name="heroGuests" value={guests} onChange={event => setGuests(event.target.value)} required>
              <option value="" disabled>Select guests</option>
              {Array.from({ length: capacity }, (_, index) => index + 1).map(count => <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}
            </select>
          </label>
          <label>Villas <span className="hero-required" aria-hidden="true">*</span>
            <select name="heroVilla" value={villa} onChange={event => {
              const next = event.target.value;
              if (!isVillaSlug(next)) return;
              setVilla(next);
              // Each villa has its own bookings, so dates chosen for another villa start over.
              setDates({ checkIn: '', checkOut: '' });
              if (Number(guests) > (villaOption(next)?.capacity ?? 0)) setGuests('');
            }} required>
              <option value="" disabled>Select a villa</option>
              {villaOptions.map(option => <option key={option.slug} value={option.slug}>{option.name}</option>)}
            </select>
          </label>
          <div className="hero-booking-field">
            <span className="hero-field-label">Check-In Date <span className="hero-required" aria-hidden="true">*</span></span>
            <DatePickerField villa={villa} mode="checkIn" checkIn={dates.checkIn} checkOut={dates.checkOut} name="heroCheckIn" placeholder="Check In" label="Check-in date"
              onSelect={date => setDates(current => ({ checkIn: date, checkOut: current.checkOut > date ? current.checkOut : '' }))}/>
          </div>
          <div className="hero-booking-field">
            <span className="hero-field-label">Check-Out Date <span className="hero-required" aria-hidden="true">*</span></span>
            <DatePickerField villa={villa} mode="checkOut" checkIn={dates.checkIn} checkOut={dates.checkOut} name="heroCheckOut" placeholder="Check Out" label="Check-out date"
              onSelect={date => setDates(current => ({ ...current, checkOut: date }))}/>
          </div>
        </div>
      </m.div></LazyMotion>
      <span className="hero-vertical" aria-hidden="true">THE ART OF DOING A LITTLE LESS</span>
    </div>
  </section>;
}
