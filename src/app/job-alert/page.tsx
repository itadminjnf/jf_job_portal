import React from 'react';
import type { Metadata } from 'next';
import { Container } from '@/components/common/Container';
import { DynamicJobAlertForm } from '@/components/forms/DynamicJobAlertForm';
import styles from './job-alert.module.css';

export const metadata: Metadata = {
  title: 'Subscribe to Career & Job Alerts',
  description: 'Never miss an international opening. Receive personalized notifications when roles matching your technical specialization are posted by Jackson & Frank.',
  alternates: {
    canonical: '/job-alert',
  },
  openGraph: {
    title: 'Subscribe to Global Job Alerts | Jackson & Frank',
    description: 'Get notified instantly when new international jobs matching your preferences are published.',
    url: 'https://jobs.jacksonandfrank.com/job-alert',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Subscribe to Global Job Alerts | Jackson & Frank',
    description: 'Get notified instantly when new international jobs matching your preferences are published.',
  },
};

export default function JobAlertPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Container>
          <h1 className={styles.title}>Create Custom Job Alert</h1>
          <p className={styles.subtitle}>
            Never miss an international opening. Receive personalized notifications when roles matching your technical specialization are posted.
          </p>
        </Container>
      </div>

      <Container>
        <div className={styles.cardWrapper}>
          <DynamicJobAlertForm />
        </div>
      </Container>
    </div>
  );
}
