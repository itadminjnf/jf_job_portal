import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAllJobs } from '@/lib/api';
import { VacanciesClient } from './VacanciesClient';
import { Loader } from '@/components/common/Loader';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Global Vacancies & International Job Openings',
  description: 'Browse verified international tech, engineering, and corporate job opportunities with premier employers across Europe, Asia, and the Americas.',
  alternates: {
    canonical: '/vacancies',
  },
  openGraph: {
    title: 'Global Vacancies & International Job Openings | Jackson & Frank',
    description: 'Browse verified international vacancies and career opportunities across Europe, Asia, and the Americas.',
    url: 'https://jobs.jacksonfrank.com/vacancies',
    siteName: 'Jackson & Frank',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Global Vacancies & International Job Openings | Jackson & Frank',
    description: 'Browse verified international vacancies and career opportunities across Europe, Asia, and the Americas.',
  },
};

export default async function VacanciesPage() {
  // Fetch all real vacancies from OTYS API (e.g. 50 items)
  const jobs = await getAllJobs({ itemsPerPage: 50 });

  return (
    <Suspense
      fallback={
        <Loader
          variant="section"
          size="lg"
          color="primary"
          text="Loading vacancies..."
          subtext="Fetching the latest career opportunities"
        />
      }
    >
      <VacanciesClient initialJobs={jobs} />
    </Suspense>
  );
}
