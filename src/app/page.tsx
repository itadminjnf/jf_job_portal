import React from 'react';
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
