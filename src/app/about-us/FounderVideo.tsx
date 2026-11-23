'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import styles from './page.module.css';

type Props = { src: string; poster: string; label: string };

const SKIP_SECONDS = 10;

const PlayIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>;
const PauseIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>;
const MutedIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="m17 9 4 6m0-6-4 6" /></svg>;
const SoundIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" /></svg>;
const BackIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.5-5.8" /><path d="M4 4v4.5h4.5" /><text x="12" y="15.5" textAnchor="middle">10</text></svg>;
const ForwardIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.5-5.8" /><path d="M20 4v4.5h-4.5" /><text x="12" y="15.5" textAnchor="middle">10</text></svg>;
const FullscreenIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /></svg>;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Founder film inside the arch: shows a thumbnail until the visitor presses play, then a full control bar with a scrubbable timeline. */
export function FounderVideo({ src, poster, label }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);

  // timeupdate fires only ~4x a second; follow the playhead every frame while playing so the timeline moves smoothly.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => { const el = video.current; if (el) setCurrent(el.currentTime); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const togglePlay = () => {
    const el = video.current;
    if (!el) return;
    setStarted(true);
    if (el.paused) void el.play(); else el.pause();
  };

  const seekTo = (time: number) => {
    const el = video.current;
    if (!el) return;
    const end = Number.isFinite(el.duration) ? el.duration : duration;
    const next = Math.min(Math.max(time, 0), end || 0);
    el.currentTime = next;
    setCurrent(next);
  };

  const skip = (delta: number) => seekTo((video.current?.currentTime ?? 0) + delta);

  const toggleSound = () => {
    const el = video.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const enterFullscreen = () => {
    const el = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!el) return;
    if (el.requestFullscreen) void el.requestFullscreen().catch(() => {});
    else el.webkitEnterFullscreen?.(); // iPhone Safari only supports fullscreen on the video element this way.
  };

  const updateBuffered = () => {
    const el = video.current;
    if (el && el.buffered.length) setBuffered(el.buffered.end(el.buffered.length - 1));
  };

  // Keyboard shortcuts while the player has focus: space/k play, ←/→ skip 5s, j/l skip 10s, m mute, f fullscreen.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!started || event.target instanceof HTMLInputElement) return;
    const actions: Record<string, () => void> = {
      ' ': togglePlay, k: togglePlay, m: toggleSound, f: enterFullscreen,
      ArrowLeft: () => skip(-5), ArrowRight: () => skip(5), j: () => skip(-SKIP_SECONDS), l: () => skip(SKIP_SECONDS),
    };
    const action = actions[event.key];
    if (action) { event.preventDefault(); action(); }
  };

  const total = duration || 0;
  const progressStyle = {
    '--progress': `${total ? (current / total) * 100 : 0}%`,
    '--buffered': `${total ? (buffered / total) * 100 : 0}%`,
  } as CSSProperties;

  return <div className={styles.founderPlayer} onKeyDown={onKeyDown}>
    <video ref={video} className={styles.founderVideo} src={src} poster={poster}
      playsInline preload="none" aria-label={label}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onLoadedMetadata={event => setDuration(event.currentTarget.duration)}
      onDurationChange={event => setDuration(event.currentTarget.duration)}
      onTimeUpdate={event => setCurrent(event.currentTarget.currentTime)}
      onProgress={updateBuffered}
      onClick={togglePlay} />

    {!started && <button type="button" className={styles.founderPlay} onClick={togglePlay} aria-label="Play founder video">
      <span className={styles.founderPlayIcon}><PlayIcon /></span>
    </button>}

    {started && <div className={styles.founderControls}>
      <div className={styles.founderTimeline}>
        <span className={styles.founderTime}>{formatTime(current)}</span>
        <input type="range" className={styles.founderSeek} style={progressStyle}
          min={0} max={total || 0} step={0.1} value={Math.min(current, total || 0)}
          disabled={!total}
          onChange={event => seekTo(Number(event.currentTarget.value))}
          aria-label="Seek founder video" aria-valuetext={`${formatTime(current)} of ${formatTime(total)}`} />
        <span className={styles.founderTime}>{formatTime(total)}</span>
      </div>
      <div className={styles.founderButtons}>
        <button type="button" className={styles.founderControl} onClick={toggleSound}
          aria-label={muted ? 'Unmute founder video' : 'Mute founder video'}>
          {muted ? <MutedIcon /> : <SoundIcon />}
        </button>
        <div className={styles.founderTransport}>
          <button type="button" className={styles.founderControl} onClick={() => skip(-SKIP_SECONDS)} aria-label="Back 10 seconds"><BackIcon /></button>
          <button type="button" className={`${styles.founderControl} ${styles.founderControlMain}`} onClick={togglePlay}
            aria-label={playing ? 'Pause founder video' : 'Play founder video'}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button type="button" className={styles.founderControl} onClick={() => skip(SKIP_SECONDS)} aria-label="Forward 10 seconds"><ForwardIcon /></button>
        </div>
        <button type="button" className={styles.founderControl} onClick={enterFullscreen} aria-label="Watch founder video full screen"><FullscreenIcon /></button>
      </div>
    </div>}
  </div>;
}
