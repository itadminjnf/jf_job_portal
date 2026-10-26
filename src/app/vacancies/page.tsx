import React, { Suspense } from 'react';
import { getAllJobs } from '@/lib/api';
import { VacanciesClient } from './VacanciesClient';

export const revalidate = 86400; // 24-hour cache for server & client router

export default async function VacanciesPage() {
  // Fetch all real vacancies from OTYS API (e.g. 50 items)
  const jobs = await getAllJobs({ itemsPerPage: 50 });

  return (
    <Suspense fallback={<div style={{ padding: '80px', textAlign: 'center', fontSize: '18px', color: '#64748B' }}>Loading vacancies...</div>}>
      <VacanciesClient initialJobs={jobs} />
    </Suspense>
  );
}
