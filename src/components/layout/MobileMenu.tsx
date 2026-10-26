'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { mainNavigation } from '@/data/navigation';
import { useJobAlertModal } from '@/context/JobAlertModalContext';
import styles from './MobileMenu.module.css';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  vacanciesCount?: number | null;
}

export function MobileMenu({ isOpen, onClose, vacanciesCount }: MobileMenuProps) {
  const pathname = usePathname();
  const { openJobAlertModal } = useJobAlertModal();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
        <div className={styles.drawerHeader}>
          <Image
            src="/images/logos/logo-dark.svg"
            alt="Jackson & Frank"
            width={190}
            height={30}
            priority
          />
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <nav>
          <ul className={styles.navList}>
            {mainNavigation.map((item) => {
              const isJobAlert = item.href === '/job-alert';
              const isVacancies = item.href === '/vacancies';
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                    onClick={(e) => {
                      if (isJobAlert) {
                        e.preventDefault();
                        onClose();
                        openJobAlertModal();
                      } else {
                        onClose();
                      }
                    }}
                  >
                    <span>{item.name}</span>
                    {isVacancies && typeof vacanciesCount === 'number' && vacanciesCount > 0 && (
                      <span className={styles.navBadge}>{vacanciesCount}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
