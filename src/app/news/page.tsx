import React from 'react';
import type { Metadata } from 'next';
import { Container } from '@/components/common/Container';
import { NewsGrid } from '@/components/news/NewsGrid';
import { newsArticles } from '@/data/news';
import styles from './news.module.css';

export const metadata: Metadata = {
  title: 'Company News & Corporate Press Releases',
  description: 'Stay updated with corporate milestones, new international office expansions, and global employment market studies from Jackson & Frank.',
  alternates: {
    canonical: '/news',
  },
  openGraph: {
    title: 'Jackson & Frank Press Releases & Corporate News',
    description: 'Corporate milestones, office expansions, and global employment research from Jackson & Frank.',
    url: 'https://jobs.jacksonandfrank.com/news',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jackson & Frank Press Releases & Corporate News',
    description: 'Corporate milestones, office expansions, and global employment research from Jackson & Frank.',
  },
};

export default function NewsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Container>
          <h1 className={styles.title}>Company News & Press Releases</h1>
          <p className={styles.subtitle}>
            Stay updated with corporate milestones, new office expansions, and global employment market studies from Jackson & Frank.
          </p>
        </Container>
      </div>

      <Container>
        <NewsGrid articles={newsArticles} />
      </Container>
    </div>
  );
}
