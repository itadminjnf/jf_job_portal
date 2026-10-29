import React from 'react';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Container } from '@/components/common/Container';
import { JobDetails } from '@/components/jobs/JobDetails';
import { getJobBySlug, getAllJobs } from '@/lib/api';
import styles from './vacancy-details.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlug(slug);

  if (!job) {
    return {
      title: 'Vacancy Not Found | Jackson & Frank',
    };
  }

  return {
    title: `${job.title} | Jackson & Frank`,
    description: job.description || `${job.title} at ${job.company} - ${job.location}`,
    openGraph: {
      title: `${job.title} | Jackson & Frank`,
      description: job.description || `${job.title} in ${job.location}`,
    },
  };
}

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

  // Canonical redirect: If accessed via raw ID but vacancy has a defined slug, redirect to canonical slug URL
  if (slug === job.id && job.slug && job.slug !== job.id) {
    redirect(`/vacancies/${job.slug}`);
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
