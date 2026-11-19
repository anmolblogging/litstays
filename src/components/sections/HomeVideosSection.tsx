'use client';

import Image from 'next/image';
import { useState } from 'react';
import villaImageLoader from '@/lib/villa-image-loader';
import styles from './HomeVideosSection.module.css';

// Owner-supplied films, with cover photography from the approved villa library.
const films = [
  { id: 'ZkFFq16fB2I', title: 'Luxury Villa in Virar, Mumbai', kind: 'Villa tour', note: 'Fly in over the treeline and wander through the villas, room by room.', poster: '/archway/optimized/archway-aerial-1-1920.webp', alt: 'The villas surrounded by trees and green hills' },
  { id: 'sp49A-K0TmQ', title: 'Amenities at LIT Stays', kind: 'Walkthrough', note: 'Private pools, open courtyards and the little comforts waiting for you.', poster: '/avante/optimized/avante-15-1920.webp', alt: 'Villa Avante’s private pool and palm-framed courtyard' },
];


export function HomeVideosSection() {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const film = films[current];

  function choose(index: number) {
    if (index === current) return;
    setCurrent(index);
    setPlaying(false);
  }

  return <section id="videos" className={`${styles.section} section-padding`} aria-labelledby="videos-heading">
    <div className={styles.heading}>
      <h2 id="videos-heading">The LIT Stays <em>on film.</em></h2>
      <p className={styles.lead}>A closer look at the villas, the pools and the unhurried afternoons before you arrive.</p>
    </div>

    <div className={styles.stage}>
      <div className={styles.screen}>
        {playing
          ? <iframe key={film.id} className={styles.player} title={film.title}
              src={`https://www.youtube-nocookie.com/embed/${film.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          : <button type="button" className={styles.cover} onClick={() => setPlaying(true)} aria-label={`Play ${film.title}`}>
              <Image key={film.poster} src={film.poster} alt={film.alt} fill loader={villaImageLoader} sizes="(max-width: 900px) 92vw, 62vw" />
              <span className={styles.shade} aria-hidden="true" />
              <span className={styles.inset} aria-hidden="true" />
              <span className={styles.coverText}>
                <span className={styles.coverKind}>{String(current + 1).padStart(2, '0')} · {film.kind}</span>
                <span className={styles.coverTitle}>{film.title}</span>
              </span>
              <span className={styles.play} aria-hidden="true">
                <span className={styles.playDisc}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 4v16l13-8z" /></svg></span>
                <span className={styles.playLabel}>Play film</span>
              </span>
            </button>}
      </div>

      <div className={styles.side}>
        <p className={styles.sideLabel}>Now showing</p>
        <ol className={styles.list}>
          {films.map((item, index) => <li key={item.id}>
            <button type="button" className={styles.item} aria-pressed={index === current} onClick={() => choose(index)}>
              <span className={styles.thumb}>
                <Image src={item.poster} alt="" fill loader={villaImageLoader} sizes="140px" />
              </span>
              <span className={styles.itemText}>
                <span className={styles.itemKind}>{String(index + 1).padStart(2, '0')} · {item.kind}</span>
                <span className={styles.itemTitle}>{item.title}</span>
                <span className={styles.itemNote}>{item.note}</span>
              </span>
            </button>
          </li>)}
        </ol>
      </div>
    </div>
  </section>;
}
