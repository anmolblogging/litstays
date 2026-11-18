import { navigation } from '@/lib/site-content';
import { BrandLogo } from '../ui/BrandLogo';
import styles from './Navigation.module.css';

export function Footer({ homePath = '', datesHref = '#enquire', datesLabel = 'Your dates' }: { homePath?: string; datesHref?: string; datesLabel?: string }) {
  const href = (value: string) => value.startsWith('#') ? `${homePath}${value}` : value;
  return <footer className={`footer section-padding ${styles.footer}`}>
    <div className="footer-main">
      <div className="footer-brand">
        <a href={href('#home')} className="wordmark footer-wordmark" aria-label="The LIT Stays home"><BrandLogo tone="sand" /></a>
        <address className="footer-address">Green Pearl Estate<br/>Virar East, Maharashtra</address>
      </div>
      <nav aria-label="Footer navigation">{navigation.map(item => <a key={item.href} href={href(item.href)}>{item.label}</a>)}<a href={datesHref}>{datesLabel}</a></nav>
    </div>
    <div className="footer-bottom"><p className="footer-copyright">Copyright {new Date().getFullYear()}<br/>All rights reserved</p></div>
  </footer>;
}
