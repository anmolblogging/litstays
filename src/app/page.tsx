import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { IntroductionSection } from '@/components/sections/PropertySections';
import { VillaSpacesSection } from '@/components/sections/VillaSpacesSection';
import { VillaCardsSection } from '@/components/sections/VillaCardsSection';
import { BookingSection } from '@/components/sections/BookingSection';
import { StayProvider } from '@/components/availability/StayProvider';
import { FAQSection } from '@/components/sections/FAQSection';
import { HomeVideosSection } from '@/components/sections/HomeVideosSection';

export default function Home() {
  return <><Navbar/><main id="main">
    <StayProvider>
      <HeroSection/>
      <div className="page-surface">
        <IntroductionSection/>
        <VillaCardsSection/>
        <VillaSpacesSection/>
        <HomeVideosSection/>
        <FAQSection/>
        <BookingSection/>
        <Footer/>
        </div>
        </StayProvider>
        </main>
        </>;
}
