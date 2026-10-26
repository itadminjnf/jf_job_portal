import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './HiringBanner.module.css';

export function HiringBanner() {
  return (
    <div className={styles.card}>
      {/* Left Column: Image with floating badge */}
      <div className={styles.imageWrapper}>
        <Image
          src="/images/banners/hiring-talent.webp"
          alt="Jackson & Frank Blog & Career Insights"
          fill
          sizes="(max-width: 768px) 100vw, 30vw"
          className={styles.image}
        />
      </div>

      {/* Right Column: Editorial Content */}
      <div className={styles.content}>

        {/* Title */}
        <h3 className={styles.title}>
          Master Global Careers &amp; Industry Trends
        </h3>

        {/* Description */}
        <p className={styles.description}>
          Expert guides, international relocation analysis, and global hiring tips written by our worldwide recruitment partners.
        </p>



        {/* CTA Button */}
        <Link
          href="https://jacksonandfrank.com/blog"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.btn}
        >
          <span>Explore Articles</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default HiringBanner;
