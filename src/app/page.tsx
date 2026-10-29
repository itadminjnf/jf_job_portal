import React from 'react';
import type { Metadata } from 'next';
import { Hero } from '@/components/home/Hero';
import { JobSearch } from '@/components/home/JobSearch';
import { PopularFilters } from '@/components/home/PopularFilters';
import { Statistics } from '@/components/home/Statistics';
import { LatestJobs } from '@/components/home/LatestJobs';
import { JobCategories } from '@/components/home/JobCategories';
import { HiringBanner } from '@/components/home/HiringBanner';
import { GlobalPresence } from '@/components/home/GlobalPresence';
import { Container } from '@/components/common/Container';
import { ProjectCtaSection } from '@/components/common/ProjectCtaSection';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Global Jobs & International Career Opportunities',
  description: 'Explore verified global job opportunities, connect with leading companies and build your career without borders with Jackson & Frank.',
  alternates: {
    canonical: '/',
  },
};

export default function HomePage() {
  return (
    <div className={styles.pageWrapper}>
      {/* 2. Hero Section */}
      <Hero />

      {/* 3. Job Search Area (overlapping hero) */}
      <JobSearch />

      {/* 4. Popular Search Filters */}
      <PopularFilters />

      {/* 5. Statistics Section */}
      <Statistics />

      {/* 6. Latest Job Opportunities */}
      <LatestJobs />

      {/* 7. Explore Jobs by Category */}
      <JobCategories />

      {/* 8. Promotional Banners (Hiring & Global Presence) */}
      <section className={styles.bannersSection} aria-label="Promotional Initiatives">
        <Container>
          <div className={styles.bannersGrid}>
            <HiringBanner />
            <GlobalPresence />
          </div>
        </Container>
      </section>

      {/* 9. Can't find the project CTA & Open Application */}
      <ProjectCtaSection />
    </div>
  );
}
