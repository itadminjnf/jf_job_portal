import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/common/Container';
import { JobDetails } from '@/components/jobs/JobDetails';
import { getJobBySlug, getAllJobs } from '@/lib/api';
import styles from './vacancy-details.module.css';

export const dynamic = 'force-dynamic';

export default async function VacancyDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);

  if (!job) {
    notFound();
  }

  // Fetch similar jobs to display in the right sidebar
  const allJobs = await getAllJobs({ itemsPerPage: 10 });
  const similarJobs = allJobs
    .filter((j) => j.id !== job.id && j.slug !== job.slug)
    .slice(0, 4);

  return (
    <div className={styles.page}>
      <Container>
        <JobDetails job={job} similarJobs={similarJobs} />
      </Container>
    </div>
  );
}
