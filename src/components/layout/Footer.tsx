'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Footer.module.css'
import { useJobAlertModal } from '@/context/JobAlertModalContext'

import { OpenApplicationModal } from '@/components/forms/OpenApplicationModal'

const opportunities = [
  { name: 'Vacancies', href: '/vacancies' },
  { name: 'Job Alert', href: '/job-alert' },
]
const company = [
  { name: 'About Jackson & Frank', href: 'https://www.jacksonandfrank.com/about-us' },
  { name: 'Blog', href: 'https://jacksonandfrank.com/blog' },
]
const year = new Date().getFullYear()

export default function Footer() {
  const pathname = usePathname()
  const { openJobAlertModal } = useJobAlertModal()
  const [isOpenAppModalOpen, setIsOpenAppModalOpen] = useState(false)

  // Ads landing page uses its own stripped-down CampaignFooter instead.
  if (pathname === '/hire-non-eu-employees-netherlands' || pathname?.startsWith('/germany/') || pathname?.startsWith('/germany')) return null

  return (
    <div className="home-content-scale">
      <footer className={styles.jfFooter}>
        <div className={styles.footerContainer}>

          {/* HERO TOP SECTION */}
          <div className={styles.footerHeroTop}>
            <Link href="/" className={styles.footerHeroLogoLink} aria-label="Jackson & Frank home">
              <img src="/assets/logo-light.svg" alt="Jackson & Frank" className={styles.footerHeroLogoImg} />
            </Link>
            <div className={styles.footerHeroCopy}>
              <h2 className={styles.footerHeroTitle}>
                Trusted Employer of Record for{' '}
                <span className={styles.footerHeroHighlight}>
                  Global Growth.
                  <svg className={styles.footerHeroUnderline} viewBox="0 0 200 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M2 6.5C50 2 150 2 198 6.5" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </span>
              </h2>
              <p className={styles.footerHeroDesc}>
                Empowering businesses worldwide with comprehensive HR solutions that ensure compliance, efficiency, and sustainable growth across global markets.
              </p>
            </div>
          </div>

          {/* LINKS SECTION */}
          <div className={styles.footerLinksGrid}>
            <div className={styles.flCol}>
              <h4>Opportunities</h4>
              {opportunities.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    if (link.href === '/job-alert') {
                      e.preventDefault();
                      openJobAlertModal();
                    }
                  }}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className={styles.flCol}>
              <h4>Company</h4>
              {company.map(link =>
                link.href.startsWith('http') ? (
                  <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer">{link.name}</a>
                ) : (
                  <Link key={link.name} href={link.href}>{link.name}</Link>
                )
              )}
            </div>

            <div className={styles.flCol}>
              <h4>Open Application</h4>
              <Link
                href="#open-application"
                onClick={(e) => {
                  e.preventDefault();
                  setIsOpenAppModalOpen(true);
                }}
              >
                Submit Open Application
              </Link>
            </div>
          </div>

          <div className={styles.footerDivider}></div>

          {/* BOTTOM SECTION */}
          <div className={styles.footerBottom}>
            <div className={styles.fbLeft}>
              &copy; {year} &nbsp; Jackson &amp; Frank | All rights reserved.
            </div>
            <div className={styles.fbRight}>
              <span className={styles.fbV}>v2.0.0</span>
              <span className={styles.fbSep}>|</span>
              <Link href="/vacancies">Vacancies</Link>
              <div className={styles.fbSocial}>
                <a href="https://www.linkedin.com/company/jacksonandfrank/" target="_blank" rel="noopener noreferrer" aria-label="Jackson & Frank on LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                </a>
                <a href="https://jacksonandfrank.com/" target="_blank" rel="noopener noreferrer" aria-label="Jackson & Frank Global Website">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </a>
                <a href="https://www.youtube.com/@JacksonAndFrank" target="_blank" rel="noopener noreferrer" aria-label="Jackson & Frank on YouTube">
                  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                </a>
              </div>
            </div>
          </div>

        </div>
      </footer>

      {/* Open Application Modal */}
      <OpenApplicationModal
        isOpen={isOpenAppModalOpen}
        onClose={() => setIsOpenAppModalOpen(false)}
      />
    </div>
  )
}

export { Footer };
