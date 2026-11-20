'use client';

import Image from 'next/image';
import { useState } from 'react';
import villaImageLoader from '@/lib/villa-image-loader';
import styles from './HomeVideosSection.module.css';

// Villa walkthrough films served from /public/videos, with covers from the villa library.
const films = [
  { id: 'villa-avante', src: '/videos/villa-avante.mp4', title: 'Villa Avante Walkthrough', kind: 'Walkthrough', note: 'Step inside Villa Avante, from the palm-framed pool to every room.', poster: '/avante/optimized/avante-21-1920.webp', alt: 'Villa Avante’s pool and courtyard at dusk' },
  { id: 'villa-archway', src: '/videos/villa-archway.mp4', title: 'Villa Archway Walkthrough', kind: 'Walkthrough', note: 'Wander through Villa Archway’s arches, courtyards and living spaces.', poster: '/archway/optimized/archway-53-1920.webp', alt: 'Villa Archway’s arched facade lit at dusk' },
  { id: 'villa-aurania', src: '/videos/villa-aurania.mp4', title: 'Villa Aurania Walkthrough', kind: 'Walkthrough', note: 'A slow tour of Villa Aurania, its pool and its quiet corners.', poster: '/aurania/optimized/aurania-8788-1920.webp', alt: 'Villa Aurania’s house and garden' },
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
          ? <video key={film.id} className={styles.player} src={film.src} poster={film.poster}
              controls autoPlay playsInline preload="metadata" title={film.title} />
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
