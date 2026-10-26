import React, { Suspense } from 'react';
import { getAllJobs } from '@/lib/api';
import { VacanciesClient } from './VacanciesClient';
import { Loader } from '@/components/common/Loader';

export const dynamic = 'force-dynamic';

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
