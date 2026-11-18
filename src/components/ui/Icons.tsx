import type { SVGProps } from 'react';

export function Arrow({ diagonal = false, ...props }: SVGProps<SVGSVGElement> & { diagonal?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" {...props}>{diagonal ? <path d="M5 19 19 5M5 5h14v14" /> : <path d="M4 12h15m-6-6 6 6-6 6" />}</svg>;
}

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  const { style, ...rest } = props;
  return <svg viewBox="0 0 306 439" aria-hidden="true" {...rest} style={{ maskImage: 'url("/brand/mark.png")', maskSize: 'contain', maskPosition: 'center', maskRepeat: 'no-repeat', ...style }}><rect width="306" height="439" fill="currentColor" /></svg>;
}

export function InstagramIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7" fill="currentColor"/></svg>;
}

export type PropertyIconKind = 'villa' | 'bed' | 'bath' | 'pool' | 'guests' | 'wifi' | 'tv' | 'music' | 'games' | 'ac' | 'microwave' | 'fridge' | 'power' | 'cutlery' | 'towels' | 'toiletries' | 'jacuzzi' | 'rain' | 'water' | 'check';

/** Picks a line icon for an amenity from its name. */
export function amenityIconKind(name: string): PropertyIconKind {
  const rules: [RegExp, PropertyIconKind][] = [
    [/jacuzzi/i, 'jacuzzi'], [/pool|swim/i, 'pool'], [/bedroom/i, 'bed'], [/bathroom/i, 'bath'], [/guest/i, 'guests'], [/wi-?fi/i, 'wifi'],
    [/netflix|\btv\b/i, 'tv'], [/music|karaoke/i, 'music'], [/game/i, 'games'], [/air cond|\bac\b/i, 'ac'], [/microwave/i, 'microwave'],
    [/refrigerator|fridge/i, 'fridge'], [/power/i, 'power'], [/cutlery/i, 'cutlery'], [/towel/i, 'towels'], [/toiletr/i, 'toiletries'],
    [/rain/i, 'rain'], [/water|cooler/i, 'water'],
  ];
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? 'check';
}

export function PropertyIcon({ kind, ...props }: SVGProps<SVGSVGElement> & { kind: PropertyIconKind }) {
  const paths = {
    villa: <><path d="m4 16 20-12 20 12M8 14v29h32V14M4 44h40M19 43V28h10v15M15 18h5v5h-5zm13 0h5v5h-5z"/><path d="M38 9V4h-6v2"/></>,
    bed: <><path d="M5 39V12m38 27V23H5m0 11h38M9 23v-7h10v7m4 0v-7h15v7M5 34v7m38-7v7"/></>,
    bath: <><path d="M5 23h38l-3 14H9L6 26M12 37v6m24-6v6M11 23V10a6 6 0 0 1 12 0v3M19 13h8M31 15v3m6-5v3"/></>,
    pool: <><path d="M4 33q5-5 10 0t10 0 10 0 10 0M4 42q5-5 10 0t10 0 10 0 10 0M13 29V9a5 5 0 0 1 10 0m6 20V9a5 5 0 0 1 10 0M13 14h16m-16 8h16"/></>,
    wifi: <><path d="M5 17a29 29 0 0 1 38 0M11 24a20 20 0 0 1 26 0M18 31a10 10 0 0 1 12 0"/><circle cx="24" cy="39" r="2" fill="currentColor" stroke="none"/></>,
    guests: <><circle cx="24" cy="14" r="6"/><path d="M13 40v-6a11 11 0 0 1 22 0v6M8 13a5 5 0 1 0 0 10m32-10a5 5 0 1 1 0 10M3 39v-6a8 8 0 0 1 7-8m35 14v-6a8 8 0 0 0-7-8"/></>,
    tv: <><rect x="5" y="9" width="38" height="25" rx="2"/><path d="M24 34v7M16 41h16"/></>,
    music: <><rect x="18" y="4" width="12" height="21" rx="6"/><path d="M12 20a12 12 0 0 0 24 0M24 32v10M17 42h14"/></>,
    games: <><rect x="7" y="7" width="34" height="34" rx="6"/><circle cx="16" cy="16" r="2" fill="currentColor" stroke="none"/><circle cx="32" cy="16" r="2" fill="currentColor" stroke="none"/><circle cx="24" cy="24" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="32" r="2" fill="currentColor" stroke="none"/><circle cx="32" cy="32" r="2" fill="currentColor" stroke="none"/></>,
    ac: <><rect x="4" y="9" width="40" height="16" rx="3"/><path d="M10 20h28M14 31v5m10-5v9m10-9v5"/></>,
    microwave: <><rect x="4" y="10" width="40" height="27" rx="3"/><rect x="9" y="15" width="23" height="17" rx="1"/><path d="M37 16v3m0 5v3M10 37v3m28-3v3"/></>,
    fridge: <><rect x="11" y="4" width="26" height="38" rx="3"/><path d="M11 18h26M16 10v4m0 9v8M15 42v2m18-2v2"/></>,
    power: <><path d="M27 4 12 27h11l-3 17 16-24H25z"/></>,
    cutlery: <><path d="M13 4v11a5 5 0 0 0 10 0V4M18 4v40M34 44V4c-4 3-7 9-7 17h7"/></>,
    towels: <><path d="M6 9h36M12 9v30h24V9M12 31h24M18 39v4h12v-4"/></>,
    toiletries: <><path d="M20 4h9M24 4v8M19 12h10v6M15 22a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v19a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3zM15 28h18"/></>,
    jacuzzi: <><path d="M5 26h38l-3 12H8zM11 38v5m26-5v5"/><circle cx="16" cy="17" r="3"/><circle cx="25" cy="10" r="2.5"/><circle cx="32" cy="18" r="2"/></>,
    rain: <><path d="M14 27a8 8 0 0 1 0-16 11 11 0 0 1 21 3 7 7 0 0 1 0 13zM17 32l-2 5m10-5-2 5m10-5-2 5M21 40l-2 5m10-5-2 5"/></>,
    water: <><path d="M24 5c7 10 12 17 12 24a12 12 0 0 1-24 0c0-7 5-14 12-24zM18 30a6 6 0 0 0 6 6"/></>,
    check: <><circle cx="24" cy="24" r="18"/><path d="m16 24 6 6 11-12"/></>,
  };
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[kind]}</svg>;
}
