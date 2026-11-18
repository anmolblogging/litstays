import Image from 'next/image';
import { villas } from '@/lib/villas';
import villaImageLoader from '@/lib/villa-image-loader';
import { Arrow, PropertyIcon } from '../ui/Icons';
import { Reveal } from '../ui/Reveal';
import styles from './VillaCardsSection.module.css';

// Homepage order confirmed by the owner.
const order = ['villa-archway', 'villa-avante', 'villa-aurania'];
const ordered = [...villas].sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));

export function VillaCardsSection() {
  return <section id="villas" className={`${styles.section} section-padding`} aria-labelledby="villas-heading">
    <div className={styles.heading}>
      <h2 id="villas-heading">Three villas. <em>One slower way to stay.</em></h2>
    </div>

    <ul className={styles.villaCards} aria-label="Our villas">
      {ordered.map((villa, index) => { const photo = villa.cardImage ?? villa.heroImage; return <li key={villa.slug}>
        <Reveal className={styles.reveal} delay={index * .08}>
          <a className={styles.villaCard} href={`/villas/${villa.slug}/`} aria-labelledby={`${villa.slug}-card-title`} aria-describedby={`${villa.slug}-card-facts`}>
            <div className={styles.photo}>
              {photo && <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 760px) 82vw, 30vw"
                loader={villaImageLoader}
                className={styles.villaCardImage}
              />}
            </div>

            <div className={styles.villaCardCopy}>
              <h3 id={`${villa.slug}-card-title`}>{villa.name}</h3>
              <p className={styles.tagline}>{villa.introduction}</p>
              <ul className={styles.facts} id={`${villa.slug}-card-facts`}>
                <li><PropertyIcon kind="bed" />{villa.bedrooms} bedrooms</li>
                <li><PropertyIcon kind={villa.hasPool ? 'pool' : 'jacuzzi'} />{villa.hasPool ? 'Private pool' : 'Private jacuzzi'}</li>
              </ul>
              <span className={styles.cta} aria-hidden="true">View villa <Arrow diagonal /></span>
            </div>
          </a>
        </Reveal>
      </li>; })}
    </ul>
  </section>;
}
