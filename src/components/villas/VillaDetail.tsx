import Image from 'next/image';
import localFont from 'next/font/local';
import type { CSSProperties } from 'react';
import { Navbar } from '../layout/Navbar';
import { Footer } from '../layout/Footer';
import { Arrow, BrandMark, PropertyIcon, amenityIconKind } from '../ui/Icons';
import { Reveal } from '../ui/Reveal';
import type { Villa } from '@/lib/villas';
import { site } from '@/lib/site-content';
import { VillaGallery } from './VillaGallery';
import { VillaDining } from './VillaDining';
import { AvailabilitySection } from '../sections/AvailabilitySection';
import { StayProvider } from '../availability/StayProvider';
import { VillaBrochureBook } from './VillaBrochureBook';
import villaImageLoader from '@/lib/villa-image-loader';
import styles from './VillaDetail.module.css';
import { VillaHeroSlideshow, type HeroSlide } from './VillaHeroSlideshow';

const montserrat = localFont({ src: '../../../public/fonts/montserrat-latin-600.woff2', weight: '600', style: 'normal', variable: '--font-villa-hero', display: 'swap' });

export function VillaDetail({ villa }: { villa: Villa }) {
  const photoStyle = {
    '--hero-position': villa.heroImage?.position || 'center',
    '--hero-mobile-position': villa.heroImage?.mobilePosition || 'center',
    '--hero-mask': villa.heroImage?.foregroundMask ? `url("${villa.heroImage.foregroundMask}")` : 'none',
    '--hero-sky': villa.heroImage?.sky || 'var(--forest)',
  } as CSSProperties;
  const heroSlides: HeroSlide[] = villa.heroImage ? [
    { id: `${villa.slug}-hero`, ...villa.heroImage },
    ...(villa.photos || []).filter(photo => photo.src !== villa.heroImage?.src).slice(0, 4),
  ] : [];
  const comfortPhoto = villa.photos?.[2];
  const [opening, ...closing] = villa.introduction.split('. ');

  return <>
    <Navbar homePath="/" currentPath={`/villas/${villa.slug}/`} enquiryHref={site.instagramMessage} />
    <main id="main" className={styles.page}>
      <div id="nav-sentinel" className={styles.navSentinel} aria-hidden="true" />
      <section className={`${styles.hero} ${montserrat.variable}`} id="home" aria-labelledby="villa-heading" style={photoStyle}>
        {heroSlides.length ? <VillaHeroSlideshow name={villa.name} slides={heroSlides} /> : <BrandMark className={styles.heroFallback} />}
        <div className={styles.heroTopShade} />
        <div className={styles.heroTitle}>
          <p aria-hidden="true">THE LIT STAYS · VILLA</p>
          <h1 id="villa-heading"><span className={styles.srOnly}>Villa </span>{villa.name.replace(/^Villa /, '')}</h1>
        </div>
        <div className={styles.heroShade} />
        <div className={`${styles.heroInner} section-padding`}>
          <div className={styles.stayBar} aria-label={`${villa.name} at a glance`}>
            <p className={styles.heroFacts}><span>{villa.location}</span><span>{villa.bedrooms} bedrooms</span><span>{villa.hasPool ? 'Private swimming pool' : 'Jacuzzi · without pool'}</span></p>
            <a href={site.instagramMessage} target="_blank" rel="noopener noreferrer">Plan your stay <Arrow diagonal /></a>
          </div>
          <a className={styles.discover} href="#villa-details">Discover <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <div className={styles.content} id="villa-content">
        <section className={`${styles.overview} section-padding`} id="villa-details" aria-labelledby="overview-heading">
          <div className={styles.overviewIntro}>
            <p className={styles.location}><span>{villa.style}</span><span aria-hidden="true" className={styles.locationRule} /><span>{villa.location}</span></p>
            <h2 id="overview-heading">{opening}{closing.length ? '.' : ''}{closing.length ? <> <em>{closing.join('. ')}</em></> : null}</h2>
            <p className={styles.overviewDescription}>{villa.description}</p>
          </div>
          <dl className={styles.staySummary} aria-label={`${villa.name} at a glance`}>
            <div><PropertyIcon kind="bed" aria-hidden="true" /><dt>Bedrooms</dt><dd>{String(villa.bedrooms).padStart(2, '0')}</dd></div>
            <div><PropertyIcon kind={villa.hasPool ? 'pool' : 'jacuzzi'} aria-hidden="true" /><dt>Your outdoors</dt><dd>{villa.hasPool ? 'Private pool' : 'Private Jacuzzi'}</dd></div>
            {villa.refundableDeposit !== undefined && <div><PropertyIcon kind="check" aria-hidden="true" /><dt>Refundable deposit</dt><dd><span className={styles.currency}>₹</span>{villa.refundableDeposit.toLocaleString('en-IN')}</dd><p className={styles.deposit}>Returned at checkout</p></div>}
          </dl>
        </section>

        <VillaBrochureBook name={villa.name} brochure={villa.brochure} />

        {villa.photos?.length ? <VillaGallery name={villa.name} photos={villa.photos} /> : null}

        <section className={`${styles.comforts} section-padding`} id="villa-comforts" aria-labelledby="amenities-heading">
          <h2 id="amenities-heading" className={styles.comfortsHeading}>The comforts.</h2>
          {comfortPhoto && <Reveal className={styles.comfortVisual}><Image src={comfortPhoto.src} alt={comfortPhoto.alt} fill loader={villaImageLoader} unoptimized={!comfortPhoto.responsive} sizes="(max-width: 800px) 100vw, 48vw" /></Reveal>}
          <div className={styles.comfortContent}>
            <ul className={styles.amenityGrid}>{villa.amenities.map(amenity => <li key={amenity.name} title={amenity.detail}><PropertyIcon kind={amenityIconKind(amenity.name)}/><span>{amenity.name}</span><span className="sr-only">{amenity.detail}</span></li>)}</ul>
          </div>
        </section>

        <VillaDining />
        <StayProvider><AvailabilitySection villa={villa.slug} continueHref={site.instagramMessage} /></StayProvider>
        <Footer homePath="/" datesHref={site.instagramMessage} />
      </div>
    </main>
  </>;
}
