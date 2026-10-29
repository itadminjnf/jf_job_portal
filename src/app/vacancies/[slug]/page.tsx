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

  const jobCanonical = `/vacancies/${job.slug || job.id}`;
  const jobDescription =
    job.description && job.description.length > 20
      ? job.description.slice(0, 160).trim()
      : `Apply for ${job.title} at ${job.company || 'Jackson & Frank'}. Location: ${job.location}. Explore global career opportunities with Jackson & Frank.`;

  return {
    title: `${job.title} in ${job.location}`,
    description: jobDescription,
    alternates: {
      canonical: jobCanonical,
    },
    openGraph: {
      title: `${job.title} in ${job.location} | Jackson & Frank`,
      description: jobDescription,
      url: `https://jobs.jacksonandfrank.com${jobCanonical}`,
      type: 'article',
      images: [
        {
          url: '/images/hero/hero-woman.png',
          width: 1200,
          height: 630,
          alt: `${job.title} - Jackson & Frank`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${job.title} in ${job.location} | Jackson & Frank`,
      description: jobDescription,
      images: ['/images/hero/hero-woman.png'],
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

  // Normalize employmentType for Schema.org
  const rawType = (job.type || '').toLowerCase();
  let employmentType = 'FULL_TIME';
  if (rawType.includes('part')) {
    employmentType = 'PART_TIME';
  } else if (rawType.includes('contract') || rawType.includes('freelance') || rawType.includes('interim')) {
    employmentType = 'CONTRACTOR';
  } else if (rawType.includes('intern')) {
    employmentType = 'INTERN';
  }

  const isRemote = rawType.includes('remote') || (job.location || '').toLowerCase().includes('remote');
  const validThroughDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const datePosted = job.dateTimestamp ? new Date(job.dateTimestamp).toISOString() : new Date().toISOString();

  // 1. Google for Jobs JSON-LD (JobPosting Schema)
  const jobPostingSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.jobDescriptionHtml || job.overviewHtml || job.description || `${job.title} at ${job.company}`,
    identifier: {
      '@type': 'PropertyValue',
      name: 'Jackson & Frank',
      value: String(job.id),
    },
    datePosted: datePosted,
    validThrough: validThroughDate,
    employmentType: employmentType,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company || 'Jackson & Frank',
      sameAs: 'https://jobs.jacksonandfrank.com',
      logo: 'https://jacksonfrank.com/images/logos/logo-dark.svg',
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.city || job.location,
        addressRegion: job.region || undefined,
        addressCountry: job.country || 'NL',
      },
    },
    directApply: true,
  };

  if (isRemote) {
    jobPostingSchema.jobLocationType = 'TELECOMMUTE';
  }

  if (job.salary) {
    jobPostingSchema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'EUR',
      value: {
        '@type': 'QuantitativeValue',
        value: job.salary,
        unitText: 'MONTH',
      },
    };
  }

  // 2. Breadcrumbs JSON-LD
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://jobs.jacksonandfrank.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Vacancies',
        item: 'https://jobs.jacksonandfrank.com/vacancies',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: job.title,
        item: `https://jobs.jacksonandfrank.com/vacancies/${job.slug || job.id}`,
      },
    ],
  };

  return (
    <div className={styles.page}>
      {/* Schema.org JobPosting & Breadcrumb Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Container>
        <JobDetails job={job} similarJobs={similarJobs} />
      </Container>
    </div>
  );
}
