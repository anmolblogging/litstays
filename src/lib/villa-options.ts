import type { VillaSlug } from './availability-rules';

// Small, client-safe list of the villas guests can choose in forms.
export const villaOptions: { slug: VillaSlug; name: string; capacity: number }[] = [
  { slug: 'villa-archway', name: 'Villa Archway', capacity: 20 },
  { slug: 'villa-avante', name: 'Villa Avante', capacity: 15 },
  { slug: 'villa-aurania', name: 'Villa Aurania', capacity: 15 },
];

export function villaOption(slug: string) {
  return villaOptions.find(option => option.slug === slug);
}
