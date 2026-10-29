import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Container } from '@/components/common/Container';
import { getNewsArticleBySlug } from '@/lib/api';
import styles from './news-details.module.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsArticleBySlug(slug);

  if (!article) {
    return {
      title: 'News Article Not Found | Jackson & Frank',
    };
  }

  const canonicalUrl = `/news/${article.slug}`;
  const description = article.summary || article.content.slice(0, 160).trim();

  return {
    title: article.title,
    description: description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${article.title} | Jackson & Frank News`,
      description: description,
      url: `https://jobs.jacksonandfrank.com${canonicalUrl}`,
      type: 'article',
      publishedTime: article.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: description,
    },
  };
}

export default async function NewsDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getNewsArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // Schema.org NewsArticle & BreadcrumbList
  const newsArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt,
    author: {
      '@type': 'Organization',
      name: article.source || 'Jackson & Frank',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Jackson & Frank',
      url: 'https://jacksonfrank.com',
      logo: 'https://jacksonfrank.com/images/logos/logo-dark.svg',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://jacksonfrank.com/news/${article.slug}`,
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://jacksonfrank.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'News',
        item: 'https://jacksonfrank.com/news',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: `https://jacksonfrank.com/news/${article.slug}`,
      },
    ],
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Container>
        <Link href="/news" className={styles.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to all news</span>
        </Link>

        <article className={styles.article}>
          <span className={styles.category}>{article.category}</span>
          <h1 className={styles.title}>{article.title}</h1>

          <div className={styles.metaRow}>
            <span>{article.publishedAt}</span>
            <span>•</span>
            <span>Source: {article.source}</span>
          </div>

          <div className={styles.content}>
            {article.content}
          </div>
        </article>
      </Container>
    </div>
  );
}
