import React from 'react';
import type { Metadata } from 'next';
import { Container } from '@/components/common/Container';
import { BlogGrid } from '@/components/blog/BlogGrid';
import { blogPosts } from '@/data/blogs';
import styles from './blog.module.css';

export const metadata: Metadata = {
  title: 'Global Career Insights & Tech Recruitment Blogs',
  description: 'Expert guides, international relocation analysis, tech visa policies, and global hiring trends written by Jackson & Frank recruitment specialists.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Jackson & Frank Blogs & Career Insights',
    description: 'Expert guides, international relocation analysis, tech visa policies, and global hiring trends.',
    url: 'https://jacksonfrank.com/blog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jackson & Frank Blogs & Career Insights',
    description: 'Expert guides, international relocation analysis, tech visa policies, and global hiring trends.',
  },
};

export default function BlogPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Container>
          <h1 className={styles.title}>Jackson & Frank Blogs & Articles</h1>
          <p className={styles.subtitle}>
            Thought leadership, international relocation analysis, and global hiring trends written by our worldwide recruitment partners.
          </p>
        </Container>
      </div>

      <Container>
        <BlogGrid posts={blogPosts} />
      </Container>
    </div>
  );
}
