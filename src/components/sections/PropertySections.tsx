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
          <IntroFade as="p" className="intro-lead" delay={.2} duration={.9}>Step into a world where luxury, comfort, and nature come together. At The LIT Stays, every villa is designed to transport you away from the city’s hustle and into a serene Balinese-inspired retreat — right here in Virar.</IntroFade>
          <IntroFade as="p" delay={.28} duration={1}>From elegant tropical architecture and thoughtfully curated interiors to private pools and peaceful outdoor spaces, every corner is crafted to make you feel like you’ve escaped to Bali, without leaving Maharashtra.</IntroFade>
          <IntroFade as="p" delay={.36} duration={1}>Whether you’re celebrating a birthday, hosting a family getaway, planning a romantic escape, or simply taking a break with friends, The LIT Stays offers an experience that feels personal, exclusive, and unforgettable.</IntroFade>
          <IntroFade as="p" delay={.44} duration={1}>Wake up to tranquil surroundings, spend your day by the pool, enjoy home-style meals with your loved ones, and end the evening under the stars. It’s not just a villa stay — it’s a destination where memories are made.</IntroFade>
          <IntroFade as="p" className="intro-pillars" delay={.52} duration={.9}>Luxury · Comfort · Nature</IntroFade>
        </div>
      </div>
    </section>
  );
}

