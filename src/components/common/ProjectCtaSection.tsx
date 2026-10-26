'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useJobAlertModal } from '@/context/JobAlertModalContext';
import { OpenApplicationModal } from '@/components/forms/OpenApplicationModal';
import styles from './ProjectCtaSection.module.css';

export function ProjectCtaSection() {
  const { openJobAlertModal } = useJobAlertModal();
  const [isOpenAppModalOpen, setIsOpenAppModalOpen] = useState(false);

  return (
    <>
      <section className={styles.section} aria-label="Project Finder and Open Application">
        {/* Background Image with Gradient Fade */}
        <div className={styles.bgImageWrap}>
          <Image
            src="/images/banners/consultation-team.webp"
            alt="Jackson & Frank Career Consultation"
            fill
            sizes="(max-width: 960px) 100vw, 55vw"
            className={styles.bgImage}
          />
          <div className={styles.gradientOverlay} />
        </div>

        <div className={styles.container}>
          <div className={styles.contentCol}>


            {/* Main Title */}
            <h2 className={styles.title}>
              Can&apos;t find the project you are looking for?
            </h2>

            {/* Subtitle */}
            <p className={styles.subtitle}>
              700+ companies partner with us for international talent and projects. Set up a Jobalert to get notified instantly, or submit an open application directly.
            </p>


            {/* Buttons Row */}
            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.orangeBtn}
                onClick={openJobAlertModal}
              >
                <span>Create a Job alert</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <button
                type="button"
                className={styles.navyBtn}
                onClick={() => setIsOpenAppModalOpen(true)}
              >
                <span>Open application</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>

            {/* Trust / Security Note */}
            <div className={styles.trustNote}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Your information is secure and confidential.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Open Application Modal */}
      <OpenApplicationModal
        isOpen={isOpenAppModalOpen}
        onClose={() => setIsOpenAppModalOpen(false)}
      />
    </>
  );
}

export default ProjectCtaSection;
