'use client';

import React, { useState } from 'react';
import { useJobAlertModal } from '@/context/JobAlertModalContext';
import { OpenApplicationModal } from '@/components/forms/OpenApplicationModal';
import styles from './ProjectCtaSection.module.css';

export function ProjectCtaSection() {
  const { openJobAlertModal } = useJobAlertModal();
  const [isOpenAppModalOpen, setIsOpenAppModalOpen] = useState(false);

  return (
    <>
      <section className={styles.section} aria-label="Project Finder and Open Application">
        <div className={styles.container}>
          <h2 className={styles.title}>
            Can&apos;t find the project you are looking for?
          </h2>
          <p className={styles.subtitle}>
            Make a Jobalert and receive automatically notifications by email when there are suitable projects!
          </p>
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.orangeBtn}
              onClick={openJobAlertModal}
            >
              Create a Job alert
            </button>
            <button
              type="button"
              className={styles.navyBtn}
              onClick={() => setIsOpenAppModalOpen(true)}
            >
              Open application
            </button>
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
