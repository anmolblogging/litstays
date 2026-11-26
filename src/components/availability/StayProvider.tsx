'use client';

import { createContext, useContext, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import type { VillaSlug } from '@/lib/availability-rules';

export type StayDates = { checkIn: string; checkOut: string };
type StayContextValue = {
  dates: StayDates; setDates: Dispatch<SetStateAction<StayDates>>;
  guests: string; setGuests: Dispatch<SetStateAction<string>>;
  villa: VillaSlug | ''; setVilla: Dispatch<SetStateAction<VillaSlug | ''>>;
};
const StayContext = createContext<StayContextValue | null>(null);

export function StayProvider({ children, villa: initialVilla = '' }: { children: ReactNode; villa?: VillaSlug | '' }) {
  const [dates, setDates] = useState<StayDates>({ checkIn: '', checkOut: '' });
  const [guests, setGuests] = useState('');
  const [villa, setVilla] = useState<VillaSlug | ''>(initialVilla);
  return <StayContext.Provider value={{ dates, setDates, guests, setGuests, villa, setVilla }}>{children}</StayContext.Provider>;
}

export function useStay() {
  const context = useContext(StayContext);
  if (!context) throw new Error('StayProvider is required');
  return context;
}
