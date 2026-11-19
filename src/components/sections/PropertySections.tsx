import Image from 'next/image';
import { Reveal } from '../ui/Reveal';
import { IntroSlideshow } from './IntroSlideshow';
import { IntroFade } from '../ui/IntroFade';

export function IntroductionSection() {
  return (
    <section className="introduction section-padding" id="introduction" aria-labelledby="introduction-heading">
      <div className="intro-layout">
        <div className="intro-heading">          <IntroFade as="h2" id="introduction-heading" delay={.12} duration={1.05}>Bali is waiting <em>for you in Virar.</em></IntroFade>
        </div>
        <Reveal className="intro-portrait">
          <Image className="intro-leaf-watermark" src="/images/intro-leaves.webp" alt="" aria-hidden="true" width={1000} height={1000} unoptimized/><IntroSlideshow />        </Reveal>
        <div className="intro-copy">
          <IntroFade delay={.2} duration={.9}>
            <ul className="intro-points">
              <li>A Balinese-inspired private villa, right here in Virar</li>
              <li>Tropical architecture and thoughtfully curated interiors</li>
              <li>Private pools and peaceful outdoor spaces</li>
              <li>Made for birthdays, family getaways, romantic escapes and time with friends</li>
              <li>Home-style meals with the people you love</li>
              <li>Slow days by the pool, evenings under the stars</li>
            </ul>
          </IntroFade>
          <IntroFade as="p" className="intro-pillars" delay={.52} duration={.9}>Luxury · Comfort · Nature</IntroFade>
        </div>
      </div>
    </section>
  );
}

