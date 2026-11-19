import type { Metadata } from 'next';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Arrow, BrandMark } from '@/components/ui/Icons';
import { Reveal } from '@/components/ui/Reveal';
import { aboutUs } from '@/lib/about-us';
import { site } from '@/lib/site-content';
import villaImageLoader from '@/lib/villa-image-loader';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'About Us | The LIT Stays',
  description: 'From one villa in November 2020 to three luxury private villas. The LIT Stays is trusted by more than 25,000 customers. Founded by Mr. Hardik Panchal.',
  alternates: { canonical: '/about-us/' },
  openGraph: {
    title: 'About Us | The LIT Stays',
    description: 'From one villa in November 2020 to a trusted luxury villa stay brand.',
    url: '/about-us/',
    images: [{ url: aboutUs.images.hero.src, alt: aboutUs.images.hero.alt }],
  },
};

export default function AboutUsPage() {
  const { images, founder } = aboutUs;
  return <>
    <Navbar homePath="/" currentPath="/about-us/" enquiryHref={site.instagramMessage} />
    <main id="main" className={styles.page}>

      {/* Full-bleed photographic opening. */}
      <section className={styles.hero} aria-labelledby="about-heading">
        <Image src={images.hero.src} alt={images.hero.alt} fill priority loader={villaImageLoader} sizes="100vw" className={styles.heroImage} />
        <div id="nav-sentinel" aria-hidden="true" />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={`${styles.heroContent} section-padding`}>
          <h1 id="about-heading">From one villa to <em>a trusted stay brand.</em></h1>
          <p className={styles.heroMeta}><span>Est. November 2020</span><span>Three private villas</span><span>{aboutUs.customers} customers</span></p>
        </div>
      </section>

      {/* The story, told beside where it began. */}
      <section className={`${styles.story} section-padding`} aria-labelledby="story-heading">
        <Reveal className={styles.storyVisual}>
          <div className={styles.storyPhoto}><Image src={images.beginning.src} alt={images.beginning.alt} fill loader={villaImageLoader} sizes="(max-width: 860px) 90vw, 38vw" /></div>
          <p className={styles.storyCaption}><span>2020</span>Where it began, with one villa.</p>
        </Reveal>
        <div className={styles.storyCopy}>
          <h2 id="story-heading">A small beginning, <em>built step by step.</em></h2>
          {aboutUs.story.map(paragraph => <p key={paragraph} className={styles.paragraph}>{paragraph}</p>)}
          <div className={styles.regions}>
            <p>Safe, private stays for guests from</p>
            <ul>{aboutUs.regions.map(region => <li key={region}>{region}</li>)}</ul>
          </div>
        </div>
      </section>

      {/* The three villas. */}
      <section className={`${styles.villas} section-padding`} aria-labelledby="villas-heading">
        <div className={styles.villasHeading}>
          <h2 id="villas-heading">One villa became <em>three.</em></h2>
          <ul className={styles.promise}>{aboutUs.promise.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
        <ul className={styles.villaGrid}>
          {aboutUs.villas.map((villa, index) => <li key={villa.slug}>
            <Reveal delay={index * .08}>
              <a href={`/villas/${villa.slug}/`} className={styles.villaCard}>
                <span className={styles.villaPhoto}><Image src={villa.src} alt={villa.alt} fill loader={villaImageLoader} sizes="(max-width: 760px) 90vw, 30vw" /></span>
                <span className={styles.villaName}><span>0{index + 1}</span>{villa.name}<Arrow diagonal /></span>
              </a>
            </Reveal>
          </li>)}
        </ul>
      </section>

      {/* Trust: one number over the landscape. */}
      <section className={styles.trust} aria-label="Trusted by our customers">
        <Image src={images.customers.src} alt={images.customers.alt} fill loader={villaImageLoader} sizes="100vw" className={styles.trustImage} />
        <div className={styles.trustShade} aria-hidden="true" />
        <div className={`${styles.trustContent} section-padding`}>
          <BrandMark aria-hidden="true" />
          <p className={styles.trustNumber}>{aboutUs.customers}</p>
          <p className={styles.trustLabel}>Trusted by more than <em>{aboutUs.customers} customers.</em></p>
        </div>
      </section>

      {/* Founder. */}
      <section className={`${styles.founder} section-padding`} aria-labelledby="founder-heading">
        <Reveal className={styles.founderVisual}>
          <div className={styles.founderPhoto}><Image src={images.founder.src} alt={images.founder.alt} fill loader={villaImageLoader} sizes="(max-width: 860px) 90vw, 40vw" /></div>
        </Reveal>
        <div className={styles.founderCopy}>
          <h2 id="founder-heading">{founder.name}</h2>
          <ul className={styles.credentials}>{founder.credentials.map(item => <li key={item}>{item}</li>)}</ul>
          <p className={styles.paragraph}>{founder.description}</p>
          <blockquote className={styles.vision}><p>{founder.vision}</p></blockquote>
          <a className={styles.cta} href={site.instagramMessage} target="_blank" rel="noopener noreferrer">Plan your stay <Arrow diagonal /></a>
        </div>
      </section>

      <Footer homePath="/" datesHref={site.instagramMessage} />
    </main>
  </>;
}
