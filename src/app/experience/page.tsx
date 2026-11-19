import type { Metadata } from 'next';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Arrow } from '@/components/ui/Icons';
import { Reveal } from '@/components/ui/Reveal';
import { experience } from '@/lib/experience';
import { site } from '@/lib/site-content';
import villaImageLoader from '@/lib/villa-image-loader';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'The Experience | The LIT Stays',
  description: 'From the moment you arrive to a slow morning goodbye: what a stay at The LIT Stays private villas in Virar feels like.',
  alternates: { canonical: '/experience/' },
  openGraph: {
    title: 'The Experience | The LIT Stays',
    description: 'Your stay at The LIT Stays, moment by moment.',
    url: '/experience/',
    images: [{ url: experience.hero.src, alt: experience.hero.alt }],
  },
};

export default function ExperiencePage() {
  const { hero, closing, steps, team } = experience;
  return <>
    <Navbar homePath="/" currentPath="/experience/" enquiryHref={site.instagramMessage} />
    <main id="main" className={styles.page}>

      <section className={styles.hero} aria-labelledby="experience-heading">
        <Image src={hero.src} alt={hero.alt} fill priority loader={villaImageLoader} sizes="100vw" className={styles.heroImage} />
        <div id="nav-sentinel" aria-hidden="true" />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={`${styles.heroContent} section-padding`}>
          <p className={styles.kicker}>The experience</p>
          <h1 id="experience-heading">Your stay, <em>moment by moment.</em></h1>
          <a href="#journey" className={styles.scrollCue}>Begin the journey <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section id="journey" className={`${styles.journey} section-padding`} aria-labelledby="journey-heading">
        <div className={styles.journeyHeading}>
          <h2 id="journey-heading">From arrival to <em>a slow goodbye.</em></h2>
        </div>
        <ol className={styles.timeline}>
          {steps.map((step, index) => <li key={step.title} className={styles.step}>
            <span className={styles.node} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <Reveal className={styles.stepPhoto}>
              <Image src={step.photo.src} alt={step.photo.alt} fill loader={villaImageLoader} sizes="(max-width: 860px) 80vw, 34vw" />
            </Reveal>
            <Reveal className={styles.stepCopy} delay={.08}>
              <p className={styles.stepTime}>{step.time}</p>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </Reveal>
          </li>)}
        </ol>
      </section>

      <section id="team" className={`${styles.team} section-padding`} aria-labelledby="team-heading">
        <div className={styles.teamHeading}>
          <h2 id="team-heading">Good people. <em>Thoughtful stays.</em></h2>
          <p>{team.introduction}</p>
        </div>
        <ul className={styles.teamCards}>{team.values.map((value, index) => <li key={value.title}>
          <Reveal className={styles.teamPhoto} delay={index * .08}><Image src={value.photo.src} alt={value.photo.alt} fill loader={villaImageLoader} sizes="(max-width: 760px) 90vw, 30vw" /></Reveal>
          <div className={styles.teamCardCopy}><span aria-hidden="true">0{index + 1}</span><div><h3>{value.title}</h3><p>{value.description}</p></div></div>
        </li>)}</ul>
      </section>

      <section className={styles.closing} aria-labelledby="closing-heading">
        <Image src={closing.src} alt={closing.alt} fill loader={villaImageLoader} sizes="100vw" className={styles.closingImage} />
        <div className={styles.closingShade} aria-hidden="true" />
        <div className={`${styles.closingContent} section-padding`}>
          <h2 id="closing-heading">Your moment <em>starts here.</em></h2>
          <a className={styles.cta} href={site.instagramMessage} target="_blank" rel="noopener noreferrer">Plan your stay <Arrow diagonal /></a>
        </div>
      </section>

      <Footer homePath="/" datesHref={site.instagramMessage} />
    </main>
  </>;
}
