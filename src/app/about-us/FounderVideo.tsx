'use client';

import { useRef, useState } from 'react';
import styles from './page.module.css';

type Props = { src: string; poster: string; label: string };

const PlayIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>;
const PauseIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>;
const MutedIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="m17 9 4 6m0-6-4 6" /></svg>;
const SoundIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" /></svg>;

/** Founder film inside the arch: shows a thumbnail until the visitor presses play. */
export function FounderVideo({ src, poster, label }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const togglePlay = () => {
    const el = video.current;
    if (!el) return;
    setStarted(true);
    if (el.paused) void el.play(); else el.pause();
  };

  const toggleSound = () => {
    const el = video.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  return <>
    <video ref={video} className={styles.founderVideo} src={src} poster={poster}
      playsInline preload="none" aria-label={label}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={togglePlay} />

    {!started && <button type="button" className={styles.founderPlay} onClick={togglePlay} aria-label="Play founder video">
      <span className={styles.founderPlayIcon}><PlayIcon /></span>
      <span className={styles.founderPlayLabel}>Watch the story</span>
    </button>}

    {started && <div className={styles.founderControls}>
      <button type="button" className={styles.founderControl} onClick={togglePlay}
        aria-label={playing ? 'Pause founder video' : 'Play founder video'}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button type="button" className={styles.founderControl} onClick={toggleSound}
        aria-label={muted ? 'Unmute founder video' : 'Mute founder video'}>
        {muted ? <MutedIcon /> : <SoundIcon />}
      </button>
    </div>}
  </>;
}
