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
  { name: 'Open Application', href: '#open-application' },
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
                    } else if (link.href === '#open-application') {
                      e.preventDefault();
                      setIsOpenAppModalOpen(true);
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

            <div className={`${styles.flCol} ${styles.openAppCol}`}>
              <h4>Open Application</h4>
              <p className={styles.openAppDesc}>
                Can&apos;t find your ideal role today? Submit your CV directly and let our global talent specialists match you with upcoming opportunities.
              </p>
              <button
                type="button"
                onClick={() => setIsOpenAppModalOpen(true)}
                className={styles.openAppBtn}
                aria-label="Submit an open application"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Submit Open Application</span>
              </button>
              <span className={styles.openAppHint}>
                Takes only 2 minutes • Direct review by recruiters
              </span>
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
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Jackson & Frank on Twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
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
