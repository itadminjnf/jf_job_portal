import React from 'react';
import Link from 'next/link';
import styles from './GlobalPresence.module.css';

export function GlobalPresence() {
  return (
    <div className={styles.presenceCard}>

      <div className={styles.earthVisual} aria-hidden="true" />

      {/* Content */}
      <div className={styles.content}>
        <h3 className={styles.title}>
          Work without<br />
          borders
        </h3>
        <p className={styles.description}>
          We connect people and businesses across the globe, enabling growth through talent.
        </p>
        <Link href="https://jacksonandfrank.com/global-hiring" target='_blank' className={styles.btn}>
          <span>Our Global Presence</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </Link>
      </div>

      {/* Metrics Overlay on right */}
      <div className={styles.metricsOverlay}>
        <div className={styles.metricItem}>
          <span className={styles.metricVal}>50+</span>
          <span className={styles.metricLabel}>Countries</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricVal}>500+</span>
          <span className={styles.metricLabel}>Clients</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricVal}>10,000+</span>
          <span className={styles.metricLabel}>Placements</span>
        </div>
      </div>
    </div>
  );
}
