'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useJobAlertModal } from '@/context/JobAlertModalContext';
import { MobileMenu } from './MobileMenu';
import styles from './Header.module.css';

export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [vacanciesCount, setVacanciesCount] = useState<number | null>(6);
  const { openJobAlertModal } = useJobAlertModal();

  useEffect(() => {
    let isMounted = true;
    fetch('/api/vacancies/count')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && typeof data?.count === 'number' && data.count > 0) {
          setVacanciesCount(data.count);
        }
      })
      .catch((err) => {
        console.error('Failed to load vacancies count', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className={styles.headerWrapper}>
      <div className={styles.pillContainer}>
        {/* Left: Jackson & Frank Logo */}
        <div className={styles.left}>
          <Link href="/" className={styles.logoLink} aria-label="Jackson & Frank Home">
            <Image
              src="/images/logos/logo-dark.svg"
              alt="Jackson & Frank - Your Global Talent Solutions"
              width={210}
              height={34}
              priority
              className={styles.logoImage}
            />
          </Link>
        </div>

        {/* Right: Vacancies + Jobalert Pill Button */}
        <div className={styles.right}>
          <Link
            href="/vacancies"
            className={`${styles.navVacancies} ${pathname?.includes('/vacancies') ? styles.activeNav : ''}`}
          >
            <span>Vacancies</span>
            {vacanciesCount !== null && vacanciesCount > 0 && (
              <span className={styles.orangeBadge} aria-label={`${vacanciesCount} active vacancies`}>
                {vacanciesCount}
              </span>
            )}
          </Link>

          <Link
            href="https://jacksonandfrank.com/blog"
            className={styles.navBlog}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Blog</span>
          </Link>

          {/* Jobalert Navy Pill Button */}
          <button
            type="button"
            onClick={openJobAlertModal}
            className={styles.jobAlertBtn}
            aria-label="Open Job Alert"
          >
            {/* Ringing Bell Icon with sound waves matching design */}
            <svg
              className={styles.bellIcon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              <path d="M4 2C2.8 3.7 2 5.7 2 8" />
              <path d="M22 8c0-2.3-.8-4.3-2-6" />
            </svg>
            <span>Jobalert</span>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            className={styles.mobileToggle}
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        vacanciesCount={vacanciesCount}
      />
    </header>
  );
}
